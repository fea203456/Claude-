# 3. Заменить в S последнее вхождение S1 на S2
S = input("S = ")
S1 = input("S1 = ")
S2 = input("S2 = ")
pos = S.rfind(S1)
if pos != -1:
    S = S[:pos] + S2 + S[pos + len(S1):]
print(S)
