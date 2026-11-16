# 18. Шифр: каждая буква заменяется на следующую в алфавите (без «ё»)
LOWER = "абвгдежзийклмнопрстуфхцчшщъыьэюя"
UPPER = LOWER.upper()

s = input("Строка: ")
result = ""
for ch in s:
    if ch in LOWER:
        result += LOWER[(LOWER.find(ch) + 1) % 32]
    elif ch in UPPER:
        result += UPPER[(UPPER.find(ch) + 1) % 32]
    else:
        result += ch
print(result)
