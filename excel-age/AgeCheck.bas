Option Explicit

' Age check: reads the age from the text box on the sheet and,
' when the button is clicked, shows whether the person is an adult (18+).
' The text box and the button are created automatically when the file opens.

Private Const TB_NAME As String = "txtAge"
Private Const BTN_NAME As String = "btnCheck"

Sub Auto_Open()
    SetupSheet
End Sub

' Creates the text box and the button (if they do not exist yet)
Sub SetupSheet()
    Dim ws As Worksheet
    Dim shp As Shape
    Dim btn As Object

    Set ws = ThisWorkbook.Worksheets(1)

    On Error Resume Next
    Set shp = ws.Shapes(TB_NAME)
    Set btn = ws.Buttons(BTN_NAME)
    On Error GoTo 0

    If shp Is Nothing Then
        With ws.Range("C3")
            Set shp = ws.Shapes.AddTextbox(1, .Left + 2, .Top + 2, .Width - 4, .Height - 4)
        End With
        shp.Name = TB_NAME
        shp.TextFrame.Characters.Text = ""
        shp.TextFrame.Characters.Font.Size = 12
        shp.Line.ForeColor.RGB = RGB(120, 120, 120)
    End If

    If btn Is Nothing Then
        With ws.Range("E3")
            Set btn = ws.Buttons.Add(.Left + 2, .Top + 2, .Width - 4, .Height - 4)
        End With
        btn.Name = BTN_NAME
        btn.Caption = T_CHECK()
        btn.OnAction = "CheckAge"
    End If
End Sub

' Button handler
Sub CheckAge()
    Dim ws As Worksheet
    Dim txt As String
    Dim age As Double

    Set ws = ThisWorkbook.Worksheets(1)
    txt = Trim(ws.Shapes(TB_NAME).TextFrame.Characters.Text)
    txt = Replace(txt, ",", Application.International(xlDecimalSeparator))

    If txt = "" Or Not IsNumeric(txt) Then
        MsgBox T_NOTNUM(), vbExclamation, T_ERROR()
        Exit Sub
    End If

    age = CDbl(txt)
    If age < 0 Or age > 150 Or age <> Int(age) Then
        MsgBox T_BAD(), vbExclamation, T_ERROR()
        Exit Sub
    End If

    If age >= 18 Then
        MsgBox T_ADULT(), vbInformation, T_RESULT()
    Else
        MsgBox T_MINOR(), vbInformation, T_RESULT()
    End If
End Sub

' ---- message texts (Unicode, so they display correctly in any Excel) ----
Private Function T_CHECK() As String
    T_CHECK = ChrW(1055) & ChrW(1088) & ChrW(1086) & ChrW(1074) & ChrW(1077) & ChrW(1088) & ChrW(1080) & ChrW(1090) & ChrW(1100)
End Function

Private Function T_ADULT() As String
    T_ADULT = ChrW(1042) & ChrW(1099) & " " & ChrW(1089) & ChrW(1086) & ChrW(1074) & ChrW(1077) & ChrW(1088) & ChrW(1096) & ChrW(1077) & ChrW(1085) & ChrW(1085) & ChrW(1086) & ChrW(1083) & ChrW(1077) & ChrW(1090) & ChrW(1085) & ChrW(1080) & ChrW(1081)
End Function

Private Function T_MINOR() As String
    T_MINOR = ChrW(1042) & ChrW(1099) & " " & ChrW(1085) & ChrW(1077) & ChrW(1089) & ChrW(1086) & ChrW(1074) & ChrW(1077) & ChrW(1088) & ChrW(1096) & ChrW(1077) & ChrW(1085) & ChrW(1085) & ChrW(1086) & ChrW(1083) & ChrW(1077) & ChrW(1090) & ChrW(1085) & ChrW(1080) & ChrW(1081)
End Function

Private Function T_RESULT() As String
    T_RESULT = ChrW(1056) & ChrW(1077) & ChrW(1079) & ChrW(1091) & ChrW(1083) & ChrW(1100) & ChrW(1090) & ChrW(1072) & ChrW(1090)
End Function

Private Function T_ERROR() As String
    T_ERROR = ChrW(1054) & ChrW(1096) & ChrW(1080) & ChrW(1073) & ChrW(1082) & ChrW(1072)
End Function

Private Function T_NOTNUM() As String
    T_NOTNUM = ChrW(1042) & ChrW(1074) & ChrW(1077) & ChrW(1076) & ChrW(1080) & ChrW(1090) & ChrW(1077) & " " & ChrW(1074) & ChrW(1086) & ChrW(1079) & ChrW(1088) & ChrW(1072) & ChrW(1089) & ChrW(1090) & " " & ChrW(1095) & ChrW(1080) & ChrW(1089) & ChrW(1083) & ChrW(1086) & ChrW(1084) & "!"
End Function

Private Function T_BAD() As String
    T_BAD = ChrW(1042) & ChrW(1086) & ChrW(1079) & ChrW(1088) & ChrW(1072) & ChrW(1089) & ChrW(1090) & " " & ChrW(1076) & ChrW(1086) & ChrW(1083) & ChrW(1078) & ChrW(1077) & ChrW(1085) & " " & ChrW(1073) & ChrW(1099) & ChrW(1090) & ChrW(1100) & " " & ChrW(1094) & ChrW(1077) & ChrW(1083) & ChrW(1099) & ChrW(1084) & " " & ChrW(1095) & ChrW(1080) & ChrW(1089) & ChrW(1083) & ChrW(1086) & ChrW(1084) & " " & ChrW(1086) & ChrW(1090) & " 0 " & ChrW(1076) & ChrW(1086) & " 150!"
End Function
