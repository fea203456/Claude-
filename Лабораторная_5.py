def task1():
    S = input("S = ")
    S0 = input("S0 = ")
    print(S.count(S0))


def task2():
    S = input("S = ")
    S0 = input("S0 = ")
    print(S.replace(S0, "", 1))


def task3():
    S = input("S = ")
    S1 = input("S1 = ")
    S2 = input("S2 = ")
    pos = S.rfind(S1)
    if pos != -1:
        S = S[:pos] + S2 + S[pos + len(S1):]
    print(S)


def task4():
    C = input("C = ")
    S = input("S = ")
    print(S.replace(C, C * 2))


def task5():
    C = input("C = ")
    S = input("S = ")
    S0 = input("S0 = ")
    print(S.replace(C, S0 + C))


def task6():
    N = int(input("N = "))
    S = input("S = ")
    if len(S) > N:
        S = S[len(S) - N:]
    else:
        S = "." * (N - len(S)) + S
    print(S)


def task7():
    N1 = int(input("N1 = "))
    N2 = int(input("N2 = "))
    S1 = input("S1 = ")
    S2 = input("S2 = ")
    print(S1[:N1] + S2[len(S2) - N2:])


def task8():
    s = input("Строка: ")
    print(" ".join(s.split()))


def task9():
    s = input("Строка: ")
    print(len(s.split()))


def task10():
    s = input("Строка: ")
    count = 0
    for word in s.split():
        if "А" in word:
            count += 1
    print(count)


def task11():
    s = input("Строка: ")
    count = 0
    for word in s.split():
        if word[0] == word[-1]:
            count += 1
    print(count)


def task12():
    s = input("Строка: ")
    print(min(len(word) for word in s.split()))


def task13():
    s = input("Строка: ")
    words = s.split(" ")
    for i in range(len(words)):
        w = words[i]
        if w:
            words[i] = w[0] + w[1:].replace(w[0], ".")
    print(" ".join(words))


def task14():
    s = input("Строка: ")
    print(" ".join(sorted(s.split())))


def task15():
    s = input("Выражение: ").replace("–", "-")
    result = int(s[0])
    for i in range(1, len(s), 2):
        digit = int(s[i + 1])
        if s[i] == "+":
            result += digit
        else:
            result -= digit
    print(result)


def task16():
    C = input("C = ")
    if C.isdigit():
        print("digit")
    elif "a" <= C.lower() <= "z":
        print("lat")
    elif "а" <= C.lower() <= "я" or C.lower() == "ё":
        print("rus")


def task17():
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


def task18():
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


def task19():
    LOWER = "абвгдежзийклмнопрстуфхцчшщъыьэюя"
    UPPER = LOWER.upper()

    s = input("Строка: ")
    K = int(input("K = "))
    result = ""
    for ch in s:
        if ch in LOWER:
            result += LOWER[(LOWER.find(ch) + K) % 32]
        elif ch in UPPER:
            result += UPPER[(UPPER.find(ch) + K) % 32]
        else:
            result += ch
    print(result)


def task20():
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


def task21():
    path = input("Полное имя файла: ")
    name = path[path.rfind("\\") + 1:]
    dot = name.rfind(".")
    if dot != -1:
        name = name[:dot]
    print(name)


def task22():
    path = input("Полное имя файла: ")
    name = path[path.rfind("\\") + 1:]
    dot = name.rfind(".")
    print(name[dot + 1:] if dot != -1 else "")


def task23():
    s = input("Строка: ")
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    answer = 0
    for i, ch in enumerate(s, start=1):
        if ch in "([{":
            stack.append(i)
        elif ch in ")]}":
            if not stack or s[stack[-1] - 1] != pairs[ch]:
                answer = i
                break
            stack.pop()
    if answer == 0 and stack:
        answer = -1
    print(answer)


while True:
    n = input("Номер задания (1-23, 0 - выход): ")
    if n == "0":
        break
    if n in [str(i) for i in range(1, 24)]:
        globals()["task" + n]()
    else:
        print("Нет такого задания")
    print()
