'*******************************************************************
'** main.brs - Punto de Entrada de la Aplicación
'** Inicia y muestra la escena principal definida en el manifest.
'*******************************************************************
Sub Main()
    print "----------- Iniciando Canal -----------"
    screen = CreateObject("roSGScreen")
    port = CreateObject("roMessagePort")
    screen.setMessagePort(port)
    screen.createScene("PlayerScene") ' Crea una instancia de nuestra PlayerScene
    screen.show()

    ' Bucle infinito para mantener la aplicación viva y procesar eventos globales si es necesario
    while(true)
        msg = wait(0, port)
        msgType = type(msg)

        if msgType = "roSGScreenEvent"
            if msg.isScreenClosed()
                print "----------- Canal Cerrado -----------"
                return
            end if
        end if
    end while
End Sub