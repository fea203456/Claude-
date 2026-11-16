# 16. Цифра / латинская буква / русская буква
C = input("C = ")
if C.isdigit():
    print("digit")
elif "a" <= C.lower() <= "z":
    print("lat")
elif "а" <= C.lower() <= "я" or C.lower() == "ё":
    print("rus")
