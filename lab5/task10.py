# 10. Количество слов, содержащих хотя бы одну букву «А»
s = input("Строка: ")
count = 0
for word in s.split():
    if "А" in word:
        count += 1
print(count)
