# language: es
@web @rf-03
Característica: RF-03 · Invitaciones
  Para sumar a alguien a la organización sin abrir un registro público
  como administradora
  quiero emitir enlaces de invitación de un solo uso y poder cancelarlos

  Aceptar una invitación crea un miembro, y eso solo lo hace el escenario de
  Screenplay del ciclo de un miembro: aquí ninguna invitación se usa.

  Antecedentes:
    Dado que Ana inició sesión como administradora

  Escenario: Emitir una invitación entrega un enlace que muestra a quién invita
    Cuando ella invita a una persona nueva como operadora
    Entonces ella recibe un enlace de invitación
    Y Iván, al abrir ese enlace, ve el correo invitado

  Escenario: Una invitación cancelada deja el enlace inservible
    Cuando ella invita a una persona nueva como operadora
    Y ella cancela esa invitación
    Entonces Iván, al abrir ese enlace, ve el aviso "Esta invitación ya no sirve"
