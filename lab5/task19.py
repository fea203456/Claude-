# 19. Шифр Цезаря со сдвигом K (0 < K < 10), без «ё»
LOWER = "абвгдежзийклмнопрстуфхцчшщъыьэюя"
UPPER = LOWER.upper()

s = input("Строка: ")
K = int(input("K = "))
result = ""
for ch in s:
    if ch in LOWER:
        result += LOWER[(LOWER.find(ch) + K) % 32]
    elif ch in UPPER:
        result += UPPER[(UPPER.find(ch) + K) % 32]
    else:
        result += ch
print(result)
