# 6. Привести строку S к длине N
N = int(input("N = "))
S = input("S = ")
if len(S) > N:
    S = S[len(S) - N:]          # отбрасываем первые символы
else:
    S = "." * (N - len(S)) + S  # дополняем точками в начале
print(S)
