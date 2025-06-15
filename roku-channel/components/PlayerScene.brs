'*******************************************************************
'** PlayerScene.brs - Lógica Completa del Reproductor de Contenido
'*******************************************************************

Sub init()
    ' --- Se ejecuta al crear la escena. Es como el 'constructor' ---
    print "[PlayerScene] - Inicializando..."

    ' Referencias a los nodos de la UI
    m.statusLabel = m.top.findNode("statusLabel")
    m.videoPlayer = m.top.findNode("videoPlayer")
    m.imagePlayer = m.top.findNode("imagePlayer")

    ' Variables para manejar el estado (como en React)
    m.playlist = invalid
    m.currentIndex = 0

    ' --- Observadores de eventos (como los 'event listeners' de JS) ---
    ' Observa el estado del video para saber cuándo termina
    m.videoPlayer.observeField("state", "onVideoStateChange")

    ' --- Temporizadores ---
    ' Timer para la duración de las imágenes (reemplaza a setTimeout)
    m.imageTimer = CreateObject("roSGNode", "Timer")
    m.imageTimer.observeField("fire", "playNextItem") ' Cuando el timer termina, avanza al siguiente

    ' Timer para hacer polling y refrescar la playlist completa
    m.pollingTimer = CreateObject("roSGNode", "Timer")
    m.pollingTimer.duration = 30 ' Refresca la playlist cada 30 segundos
    m.pollingTimer.repeat = true
    m.pollingTimer.observeField("fire", "fetchPlaylistFromServer")
    m.pollingTimer.control = "start"

    ' Hacemos la primera petición para obtener la playlist
    fetchPlaylistFromServer()
End Sub

'*******************************************************************
'** Obtiene la lista de reproducción completa desde el servidor
'*******************************************************************
Sub fetchPlaylistFromServer()
    print "[PlayerScene] - Pidiendo playlist al servidor..."
    m.statusLabel.text = "Actualizando lista de reproducción..."
    m.statusLabel.visible = true

    ' REEMPLAZA ESTA URL con la de tu servidor y el ID de pantalla
    serverUrl = "http://<IP_PUBLICA_DE_TU_SERVIDOR>:3001/api/screens/1/live"

    urlTransfer = CreateObject("roUrlTransfer")
    urlTransfer.setUrl(serverUrl)
    port = CreateObject("roMessagePort")
    urlTransfer.setPort(port)
    urlTransfer.AsyncGetToString()

    msg = wait(5000, port)
    if type(msg) = "roUrlEvent" and msg.GetResponseCode() = 200 then
        print "[PlayerScene] - Playlist recibida."
        json = ParseJson(msg.GetString())

        ' Solo reinicia la reproducción si la playlist es nueva o diferente
        ' (Esta es una optimización, por ahora la reiniciamos siempre)
        m.playlist = json
        m.currentIndex = 0
        playNextItem() ' Inicia la reproducción del primer ítem
    else
        m.statusLabel.text = "Error al obtener la lista de reproducción."
        print "[PlayerScene] - Error o timeout al obtener la playlist."
    end if
End Sub

'*******************************************************************
'** Función principal que reproduce el ítem actual de la lista
'** Es el corazón de la lógica de reproducción.
'*******************************************************************
Sub playNextItem()
    ' Detiene cualquier timer de imagen que pudiera estar corriendo
    m.imageTimer.control = "stop"

    if m.playlist = invalid or m.playlist.items.count() = 0 then
        m.statusLabel.text = "Lista de reproducción vacía o inválida."
        return
    end if

    ' Si llegamos al final, reiniciamos la lista (loop)
    if m.currentIndex >= m.playlist.items.count() then
        m.currentIndex = 0
        print "[PlayerScene] - Fin de la lista. Reiniciando."
    end if

    currentItem = m.playlist.items[m.currentIndex]
    print "[PlayerScene] - Reproduciendo ítem " + stri(m.currentIndex) + ". Tipo: " + currentItem.type

    m.statusLabel.visible = false

    ' --- Lógica de bifurcación por tipo de contenido (como en React) ---
    if currentItem.type = "video"
        m.imagePlayer.visible = false
        m.videoPlayer.visible = true

        videoContent = CreateObject("roSGNode", "ContentNode")
        videoContent.url = currentItem.url

        m.videoPlayer.content = videoContent
        m.videoPlayer.control = "play"

    else if currentItem.type = "image"
        m.videoPlayer.control = "stop"
        m.videoPlayer.visible = false
        m.imagePlayer.visible = true

        m.imagePlayer.uri = currentItem.url

        ' Iniciamos el timer con la duración de la imagen
        m.imageTimer.duration = currentItem.duration
        m.imageTimer.control = "start"

    else
        ' Si el tipo no es soportado, lo saltamos y vamos al siguiente
        print "[PlayerScene] - Tipo de contenido no soportado: " + currentItem.type
        m.currentIndex++
        playNextItem()
    end if
End Sub

'*******************************************************************
'** Se ejecuta cuando el estado del video cambia (play, pause, finish)
'** Reemplaza al evento 'onEnded' de JS.
'*******************************************************************
Sub onVideoStateChange()
    state = m.videoPlayer.state
    if state = "finished" then
        print "[PlayerScene] - Video finalizado. Avanzando al siguiente."
        m.currentIndex++
        playNextItem()
    end if
End Sub