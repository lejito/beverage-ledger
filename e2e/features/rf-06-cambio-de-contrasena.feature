# language: es
@web @rf-06
Característica: RF-06 · Cambio de contraseña
  Para que nadie siga entrando con una contraseña que ya no es mía
  como miembro de la organización
  quiero cambiarla sabiendo qué exige y qué pasa con mis sesiones

  Sobre la cuenta fija de operador ningún cambio prospera: el cambio real lo
  hace el escenario de Screenplay sobre el miembro que crea su corrida.

  Antecedentes:
    Dado que Óscar inició sesión como operador
    Y él abre su perfil

  Escenario: La política y la advertencia de cierre de sesiones están a la vista
    Entonces él ve el mensaje "Al menos 12 caracteres, con minúscula, mayúscula y un dígito."
    Y él ve el mensaje "Cierra todas las sesiones, incluida esta. Volverás a entrar con la contraseña nueva."

  Esquema del escenario: Un cambio que no se acepta: <caso>
    Cuando él intenta cambiar la contraseña "<actual>" por "<nueva>" repitiendo "<repetida>"
    Entonces él ve el mensaje "<mensaje>"
    Y él sigue en su perfil

    Ejemplos:
      | caso                     | actual          | nueva             | repetida           | mensaje                                   |
      | la repetición no coincide | Cualquiera-2026 | Nueva-Segura-2026 | Otra-Distinta-2026 | No coincide con lo que escribiste arriba. |
      | la actual es incorrecta   | Cualquiera-2026 | Nueva-Segura-2026 | Nueva-Segura-2026  | No se pudo cambiar la contraseña          |
