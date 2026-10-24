# language: es
@web @rf-01
Característica: RF-01 · Inicio de sesión
  Para registrar los movimientos de la bodega
  como miembro de la organización
  quiero entrar con mis credenciales y que nadie entre con unas que no existen

  Regla: solo entra quien tiene una cuenta activa, y entra a lo que su rol permite

    Escenario: Un operador entra y no ve la administración
      Dado que Óscar abre la pantalla de inicio de sesión
      Cuando él entra como operador
      Entonces él llega al panel
      Y él no ve el enlace "Administración"

    Esquema del escenario: Unas credenciales que no sirven no dejan entrar: <caso>
      Dado que Óscar abre la pantalla de inicio de sesión
      Cuando él escribe el correo "<correo>" y la contraseña "<contraseña>"
      Y él envía el formulario
      Entonces él ve el mensaje "<mensaje>"
      Y él sigue en la pantalla de inicio de sesión

      Ejemplos:
        | caso               | correo                             | contraseña    | mensaje                                             |
        | cuenta inexistente | nadie+gherkin@beverageledger.test | NoExiste-2026 | Invalid email or password                           |
        | correo mal escrito | no-es-un-correo                    | NoExiste-2026 | Escribe un correo con la forma nombre@dominio.com. |

    Escenario: Un enlace profundo sin sesión vuelve a su destino después de entrar
      Dado que Óscar abre "/catalog" sin haber iniciado sesión
      Cuando él entra como operador
      Entonces él llega a "/catalog"
