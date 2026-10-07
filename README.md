# 줄노트 게시판

정적 HTML/CSS/JavaScript 게시판입니다. Supabase를 연결하면 글과 사진을 저장하고, Realtime으로 게시글 등록/삭제를 동기화합니다. 연결하지 않은 로컬 미리보기에는 테스트 글 5개가 표시됩니다.

## Supabase 설정

1. Supabase 대시보드에서 프로젝트를 만듭니다.
2. SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행합니다.
3. 프로젝트 URL과 publishable key를 `supabase-config.js`의 `url` 및 `publishableKey`에 넣습니다.
4. 페이지를 새로고침합니다. 실 연결 모드에서는 테스트 글 대신 DB 게시글이 표시됩니다.

로그인 없이 누구나 글을 작성하고 게시글과 사진을 삭제할 수 있게 구성되어 있습니다. 사진은 JPG, PNG, WebP, GIF만 허용하고 최대 크기는 5 MB입니다. 파일 저장소도 공개 읽기/업로드/삭제로 열립니다.

## 로컬 미리보기

프로젝트 폴더에서 `python -m http.server 4173`을 실행한 뒤 `http://127.0.0.1:4173`을 엽니다. Supabase 설정 값이 비어 있으면 브라우저 안의 샘플 데이터로 동작합니다.

## GitHub Pages 배포

1. 프로젝트를 GitHub 저장소의 `main` 브랜치에 올립니다.
2. 저장소 Settings → Secrets and variables → Actions에서 `SUPABASE_URL` 및 `SUPABASE_PUBLISHABLE_KEY`를 추가합니다.
3. Settings → Pages에서 build and deployment source를 GitHub Actions로 지정합니다.
4. `main`에 push하면 `.github/workflows/pages.yml`이 배포합니다.

Supabase publishable key는 브라우저에 노출되는 공개 키이며, 권한은 SQL의 RLS 정책으로 제한합니다. `service_role` 또는 secret key는 이 사이트에 넣지 마세요.

샘플 첨부 사진: [Unsplash — Kateryna Hliznitsova](https://unsplash.com/photos/an-open-notebook-with-a-pen-on-top-of-it-KjACuxz90uA)
