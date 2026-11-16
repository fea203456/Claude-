# 20. Расшифровка шифра Цезаря со сдвигом K
LOWER = "абвгдежзийклмнопрстуфхцчшщъыьэюя"
UPPER = LOWER.upper()

s = input("Зашифрованная строка: ")
K = int(input("K = "))
result = ""
for ch in s:
    if ch in LOWER:
        result += LOWER[(LOWER.find(ch) - K) % 32]
    elif ch in UPPER:
        result += UPPER[(UPPER.find(ch) - K) % 32]
    else:
        result += ch
print(result)
