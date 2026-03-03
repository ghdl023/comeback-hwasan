# FitLog - Personal Workout Tracker

Next.js (App Router) + TypeScript + Supabase 기반의 개인 헬스/웨이트 운동기록 앱입니다.

## 기술 스택

- **Frontend**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth)
- **인증**: Google OAuth (Supabase Auth)
- **배포**: Vercel

## Supabase 프로젝트 설정

### 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에서 새 프로젝트를 생성합니다.
2. 프로젝트 대시보드에서 `Project URL`과 `anon public key`를 확인합니다.

### 2. 데이터베이스 테이블 & RLS 생성

1. Supabase 대시보드 > **SQL Editor** 로 이동합니다.
2. `supabase/schema.sql` 파일의 내용을 전체 복사하여 실행합니다.
3. 3개의 테이블(`exercises`, `workouts`, `workout_sets`)과 RLS 정책이 자동으로 생성됩니다.

### 3. Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Credentials
2. OAuth 2.0 Client ID를 생성합니다.
   - Authorized redirect URI에 `https://<your-supabase-project>.supabase.co/auth/v1/callback` 추가
3. Supabase 대시보드 > **Authentication** > **Providers** > **Google**
   - Google Provider를 활성화하고 Client ID와 Client Secret을 입력합니다.

## 로컬 실행 방법

### 1. 환경변수 설정

`.env.local` 파일을 생성하고 아래 내용을 입력합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. 의존성 설치 & 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5000` 으로 접속합니다.

## Vercel 배포 방법

### 1. GitHub에 코드 푸시

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Vercel 프로젝트 생성

1. [Vercel](https://vercel.com)에서 GitHub 리포지토리를 Import합니다.
2. Framework Preset: **Next.js** (자동 감지됨)

### 3. 환경변수 설정 (Vercel)

Vercel 프로젝트 Settings > Environment Variables에 아래 변수를 추가합니다:

| 변수명 | 값 |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |

### 4. Google OAuth Redirect URI 업데이트

Vercel 배포 후 받은 도메인(예: `your-app.vercel.app`)에 맞게:

1. Supabase 대시보드 > Authentication > URL Configuration
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs에 `https://your-app.vercel.app/auth/callback` 추가

2. Google Cloud Console > OAuth Client
   - Authorized redirect URI에 `https://<supabase-project>.supabase.co/auth/v1/callback` 가 있는지 확인

### 5. 배포

```bash
vercel --prod
```

또는 GitHub에 push하면 Vercel이 자동으로 배포합니다.

## 프로젝트 구조

```
app/                    # Next.js App Router 페이지
  layout.tsx            # 루트 레이아웃
  page.tsx              # 랜딩 페이지
  login/page.tsx        # 로그인 페이지
  auth/callback/route.ts # OAuth 콜백
  dashboard/            # 대시보드
  workouts/             # 운동 기록 (목록/생성/상세)
  exercises/            # 운동 종목 관리
components/             # React 컴포넌트
  auth-provider.tsx     # 인증 컨텍스트
  navbar.tsx            # 네비게이션 바
  theme-provider.tsx    # 다크모드 제공자
  ui/                   # shadcn/ui 컴포넌트
lib/
  supabase/client.ts    # 브라우저용 Supabase 클라이언트
  supabase/server.ts    # 서버용 Supabase 클라이언트
  supabase/middleware.ts # 미들웨어 헬퍼
  types.ts              # TypeScript 타입 정의
middleware.ts           # Next.js 미들웨어 (세션 관리)
supabase/schema.sql     # DB 스키마 + RLS 정책
```

## 보안

- **RLS(Row Level Security)** 활성화: 모든 테이블에 사용자별 접근 제어 적용
- **Anon Key만 사용**: 프론트엔드에서 Service Role Key를 사용하지 않음
- **미들웨어 세션 갱신**: JWT 토큰 자동 갱신 처리
