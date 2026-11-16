# 17. Целое число -> 1, вещественное -> 2, не число -> 0
s = input("Строка: ")
try:
    int(s)
    print(1)
except ValueError:
    try:
        float(s)
        print(2 if "." in s else 0)
    except ValueError:
        print(0)
