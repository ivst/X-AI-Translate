# AI Translate עבור X ו-YouTube

הרחבת Chrome לתרגום טקסט מסומן, פוסטים של X (Twitter) ותגובות YouTube באמצעות מפתח API משלך (תואם OpenAI וספקים מקוריים נתמכים).

[![AI Translate in Chrome Web Store](ai-adv-large.png)](https://chromewebstore.google.com/detail/ai-translate-for-x-and-yo/ccgnhaicdhdhhangmfkddcippajhbbji)

Chrome Web Store: https://chromewebstore.google.com/detail/ai-translate-for-x-and-yo/ccgnhaicdhdhhangmfkddcippajhbbji

## תכונות
- תרגום טקסט מסומן דרך תפריט ההקשר או קיצור `Alt+Shift+T` (פלט streaming).
- כפתור תרגום inline מתחת לפוסטים/תגובות ב-X ותגובות YouTube (streaming).
- כפתור תרגום מהיר אופציונלי ליד הסימון.
- בלוק תרגום מהיר ב-popup עם החלפת זוג שפות, שמירת קלט/פלט אחרון ושמירת זוג השפות.
- תומך ב-OpenAI, Claude, Gemini, DeepSeek, YandexGPT, OpenRouter ו-endpoints מותאמים תואמי OpenAI.
- רשימת מודלים של OpenRouter עם סינון Free-only ומטמון.
- טעינה אוטומטית של רשימות מודלים עבור OpenAI, Claude, Gemini, OpenRouter ו-YandexGPT.
- מצבי פלט: toast בפינה הימנית התחתונה או modal ממורכז (ללא פלט ב-popup של ההרחבה).
- בחירת שפת מקור ויעד (autodetect זמין).
- ניתן לשמור מפתחות API מקומית (ברירת מחדל) או לסנכרן בין מכשירים (אופציונלי, פחות מאובטח).
- תוצאות נשמרות כ-"Last translation / Last error" ב-popup.

## שימוש
1. פתחו את ה-popup ולחצו **Settings** (דף options).
2. הגדירו API base URL, מפתח, מודל, שפות ומצב פלט.
3. בכל עמוד, סמנו טקסט והשתמשו בתפריט ההקשר או בקיצור.
4. ב-X ובתגובות YouTube, לחצו על "תרגם טקסט" מתחת לתוכן נתמך כדי לראות תרגום inline. ניתן לכבות את הכפתורים האלה ב-Settings.

## הגדרות (דף Options)
- Presets של ספקים ו-endpoint מותאם.
- רענון/טעינת מודלים עבור OpenAI, Claude, Gemini, OpenRouter (user/public, free-only) ו-YandexGPT.
- מצב פלט + משך overlay.
- מתג לכפתור תרגום מהיר ליד הסימון.
- סנכרון אופציונלי של מפתחות API בין מכשירים עם אזהרת אבטחה.
- מתגים נפרדים להצגה או להסתרה של כפתורי התרגום ב-X וב-YouTube.

## הרשאות
- ה-content script רץ על `<all_urls>` כדי לזהות בחירת טקסט ולהציג ממשק תרגום inline היכן שנתמך.
- `contextMenus`, `storage`, `activeTab`, `scripting`, `notifications`
- הרשאות host עבור ספקי API מוגדרים ו-APIs של X/Twitter

## פיתוח
- Load unpacked ב-`chrome://extensions`
- קבצי כניסה: `background.js`, `content.js`, `popup.html`, `popup.js`, `options.html`, `options.js`

## פרטיות
הטקסט המסומן נשלח רק ל-API endpoint שהוגדר על ידכם.
ראו `PRIVACY_POLICY.md`.

## יצירת קשר
- Email: `xtran@msk.onl`

