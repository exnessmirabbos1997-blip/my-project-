# Metodologiya

Model: ikki rezervuarli ombor, `dLᵢ/dt = 100·(Qkir·sᵢ·(1−HHᵢ) − n·u·Qn·cᵢ − Qm·cᵢ + Qm·mᵢ − Qsiz)/(60·V)` (sath %, oqim m³/soat). SIS: LALL (nasoslar to'xtaydi), LAHH (kirish klapani yopiladi), vakuum himoyasi; ovoz berish 1oo2/2oo2, signal yo'qolsa kanal "trip" ovozini beradi (fail-safe).

AI: (1) sath balansi qoldig'i `z = (v − v_kut)/σ`, `σ = √((0,03k)² + (0,15·n·qn)²)` va 60 daqiqalik oynadagi o'rtacha `z₆₀`; (2) bosim qiyaligi; (3) Isolation Forest (100 daraxt, 256 tanlanma, 40 normal ssenariyda); (4) dinamik xavf indeksi `R = max_j(w₁x₁ + w₂x₂) + w₃x₃ + w₄x₄`; (5) sabab tashxisi fizik qoidalar bo'yicha.

**Sath balansi chegarasi (zT).** "Sizish" va "aylanma oqim" tashxisi `|z₆₀| > zT` shartiga tayanadi. `zT` normal ssenariylardagi kuzatilgan maksimumdan o'rganiladi (`max(2,0; 3·maks)`, ≤ 6,8), shuning uchun real ma'lumotda shovqin yuqori bo'lsa chegara avtomatik oshadi.

Cheklovlar: parametrlar taxminiy (V, Qn, chegaralar), ma'lumot sintetik; real DCS/SIS tarixi bilan sozlanmagan. Soxta ogohlantirish ≈ 3 % (4/150), shovqin ×3 da f7 tashxisi 7/10.
