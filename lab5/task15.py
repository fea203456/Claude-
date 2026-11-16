# 15. Значение выражения вида «цифра±цифра±...±цифра»
s = input("Выражение: ").replace("–", "-")  # поддержка длинного тире
result = int(s[0])
for i in range(1, len(s), 2):
    digit = int(s[i + 1])
    if s[i] == "+":
        result += digit
    else:
        result -= digit
print(result)
