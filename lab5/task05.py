# 5. Перед каждым вхождением символа C в строку S вставить строку S0
C = input("C = ")
S = input("S = ")
S0 = input("S0 = ")
print(S.replace(C, S0 + C))
