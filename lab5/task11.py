# 11. Количество слов, которые начинаются и заканчиваются одной и той же буквой
s = input("Строка: ")
count = 0
for word in s.split():
    if word[0] == word[-1]:
        count += 1
print(count)
