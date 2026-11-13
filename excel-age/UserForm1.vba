' ===== Код формы UserForm1 =====
' На форме должны быть: TextBox1 (поле для возраста) и CommandButton1 (кнопка "Проверить")

Private Sub UserForm_Initialize()
    Me.Caption = "Проверка возраста"
    CommandButton1.Caption = "Проверить"
End Sub

Private Sub CommandButton1_Click()
    Dim txt As String
    Dim age As Long

    txt = Trim(TextBox1.Text)

    ' Проверка, что введено целое неотрицательное число
    If txt = "" Or Not IsNumeric(txt) Then
        MsgBox "Введите возраст числом!", vbExclamation, "Ошибка"
        TextBox1.SetFocus
        Exit Sub
    End If

    If CDbl(txt) < 0 Or CDbl(txt) <> Int(CDbl(txt)) Then
        MsgBox "Возраст должен быть целым неотрицательным числом!", vbExclamation, "Ошибка"
        TextBox1.SetFocus
        Exit Sub
    End If

    age = CLng(txt)

    If age >= 18 Then
        MsgBox "Вы совершеннолетний", vbInformation, "Результат"
    Else
        MsgBox "Вы несовершеннолетний", vbInformation, "Результат"
    End If
End Sub
