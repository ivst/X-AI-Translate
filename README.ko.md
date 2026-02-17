# X 및 YouTube용 AI 번역

<p align="center">
  <img src="icon.png" alt="AI Translate Logo" width="128" height="128" />
</p>

자체 API 키(OpenAI 호환 및 지원되는 기본 공급자)를 사용하여 선택한 텍스트, X(Twitter) 게시물 및 YouTube 댓글을 번역하기 위한 Chrome 확장 프로그램입니다.

## 특징
- 상황에 맞는 메뉴 또는 단축키 `Alt+Shift+T`(스트리밍 출력)을 통해 선택한 텍스트를 번역합니다.
- X 게시물/답글 및 YouTube 댓글(스트리밍 출력) 아래의 인라인 번역 버튼.
- 텍스트 선택 근처에 있는 선택적 빠른 번역 버튼입니다.
- 언어 쌍 스위치가 있는 팝업 빠른 번역 블록, 마지막 입력/출력 저장 및 언어 쌍 저장.
- OpenAI, Claude, Gemini, DeepSeek, YandexGPT, OpenRouter 및 맞춤형 OpenAI 호환 엔드포인트를 지원합니다.
- 무료 전용 필터 및 캐시가 포함된 OpenRouter 모델 목록입니다.
- OpenAI, Claude, Gemini, OpenRouter 및 YandexGPT에 대한 자동 로딩 모델 목록입니다.
- 출력 모드: 오른쪽 하단 토스트 또는 중앙 모달(확장 팝업 출력 없음)
- 타겟 + 소스 언어 선택(자동 감지 가능)
- API 키는 로컬에 저장되거나(기본값) 여러 장치에서 동기화될 수 있습니다(선택 사항, 덜 안전함).
- 결과는 팝업의 '마지막 번역/마지막 오류'에 저장됩니다.

## 용법
1. 팝업을 열고 → **Open settings**(옵션 페이지)을 클릭합니다.
2. API 기본 URL, 키, 모델, 언어 및 출력 모드를 구성합니다.
3. 어느 페이지에서나 텍스트를 선택하고 상황에 맞는 메뉴나 단축키를 사용하세요.
4. X 또는 YouTube 댓글에서 인라인 번역을 보려면 콘텐츠 아래의 '텍스트 번역'을 클릭하세요.

## 설정(옵션 페이지)
- 공급자 사전 설정 및 사용자 정의 엔드포인트.
- OpenAI, Claude, Gemini, OpenRouter(사용자/공개, ​​무료 전용) 및 YandexGPT에 대한 모델 새로 고침/로드.
- 출력 모드 + 오버레이 기간.
- 빠른 선택 버튼 토글.
- 보안 경고가 있는 장치 간 선택적 API 키 동기화.

## 권한
- `contextMenus`, `storage`, `activeTab`, `scripting`, `notifications`
- 구성된 API 제공업체 및 X/Twitter API에 대한 호스트 권한

## 개발
- `chrome://extensions`에 압축이 풀린 로드
- 참가 파일: `background.js`, `content.js`, `popup.html`, `popup.js`, `options.html`, `options.js`

## 은둔
선택한 텍스트는 구성한 API 엔드포인트로만 전송됩니다.
`PRIVACY_POLICY.md`을 참조하세요.

## 연락하다
- 이메일: `xtran@msk.onl`
