# Compiler Frontend

فرانت‌اند ساده‌ی پنل (HTML/CSS/JS خالص، بدون فریم‌ورک). با بک‌اند پایتون (ریپوی `Compiler`) از طریق API صحبت می‌کنه.

## راه‌اندازی

1. بک‌اند رو اول روی Railway دیپلوی کن و آدرسش رو بگیر (مثلاً `https://compiler-production-xxxx.up.railway.app`).
2. فایل `config.js` رو باز کن و `API_BASE_URL` رو با همون آدرس عوض کن.
3. این ریپو رو (چون عمومیه و فقط HTML/CSS/JS ساده‌ست) می‌تونی رایگان با **GitHub Pages** میزبانی کنی:
   - برو Settings ریپو → Pages
   - زیر Source، شاخه‌ی `main` و پوشه‌ی `/ (root)` رو انتخاب کن
   - Save بزن؛ بعد چند دقیقه یک آدرس عمومی می‌گیری (مثلاً `https://Net2027.github.io/Compiler-Frontend/`)

## نکته

اگه بک‌اند رو با `FRONTEND_ORIGIN` محدود کردی، باید همین آدرس GitHub Pages رو دقیقاً به همون متغیر بدی وگرنه درخواست‌ها با خطای CORS رد می‌شن.
