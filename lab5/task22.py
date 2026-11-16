# 22. Расширение файла (без точки) из полного имени
path = input("Полное имя файла: ")
name = path[path.rfind("\\") + 1:]
dot = name.rfind(".")
print(name[dot + 1:] if dot != -1 else "")
