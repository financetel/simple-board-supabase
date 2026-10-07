-- Run this file in Supabase SQL Editor for the public, no-login bulletin board.
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author text not null default '익명' check (char_length(author) <= 16),
  content text not null check (char_length(content) between 1 and 500),
  image_path text,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;
alter table public.posts replica identity full;
grant select, insert, delete on public.posts to anon;

drop policy if exists "Public can read posts" on public.posts;
create policy "Public can read posts" on public.posts for select to anon using (true);
drop policy if exists "Public can create posts" on public.posts;
create policy "Public can create posts" on public.posts for insert to anon with check (true);
drop policy if exists "Public can delete posts" on public.posts;
create policy "Public can delete posts" on public.posts for delete to anon using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view post images" on storage.objects;
create policy "Public can view post images" on storage.objects for select to anon using (bucket_id = 'post-images');
drop policy if exists "Public can upload post images" on storage.objects;
create policy "Public can upload post images" on storage.objects for insert to anon with check (bucket_id = 'post-images');
drop policy if exists "Public can delete post images" on storage.objects;
create policy "Public can delete post images" on storage.objects for delete to anon using (bucket_id = 'post-images');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;
end $$;
