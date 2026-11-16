# 23. Проверка правильности расстановки скобок (), [], {}
s = input("Строка: ")
pairs = {")": "(", "]": "[", "}": "{"}
stack = []        # позиции открывающих скобок
answer = 0
for i, ch in enumerate(s, start=1):   # позиции нумеруются с 1
    if ch in "([{":
        stack.append(i)
    elif ch in ")]}":
        if not stack or s[stack[-1] - 1] != pairs[ch]:
            answer = i                 # первая ошибочная скобка
            break
        stack.pop()
if answer == 0 and stack:
    answer = -1                        # не хватает закрывающих скобок
print(answer)
