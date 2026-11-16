# 21. Имя файла без расширения из полного имени
path = input("Полное имя файла: ")
name = path[path.rfind("\\") + 1:]   # отрезаем диск и каталоги
dot = name.rfind(".")
if dot != -1:
    name = name[:dot]
print(name)
