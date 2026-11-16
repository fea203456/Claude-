# 13. Заменить в каждом слове последующие вхождения его первой буквы на «.»
# split(" ") сохраняет пустые элементы, поэтому количество пробелов не меняется
s = input("Строка: ")
words = s.split(" ")
for i in range(len(words)):
    w = words[i]
    if w:
        words[i] = w[0] + w[1:].replace(w[0], ".")
print(" ".join(words))
