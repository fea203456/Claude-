# 7. Первые N1 символов S1 + последние N2 символов S2
N1 = int(input("N1 = "))
N2 = int(input("N2 = "))
S1 = input("S1 = ")
S2 = input("S2 = ")
print(S1[:N1] + S2[len(S2) - N2:])
