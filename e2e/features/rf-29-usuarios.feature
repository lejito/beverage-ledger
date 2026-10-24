# language: es
@web @rf-29
Característica: RF-29 · Gestión de usuarios
  Para que quien mueve la mercancía no administre a quienes la mueven
  como administradora
  quiero gestionar a los miembros sin poder dejarme fuera a mí misma

  Escenario: La fila propia se marca y no ofrece suspender
    Dado que Ana inició sesión como administradora
    Cuando ella abre la lista de usuarios
    Entonces su propia fila dice "tú" y no ofrece "Suspender"

  Escenario: Suspender a otro miembro pide confirmación y cancelar no lo cambia
    Dado que Ana inició sesión como administradora
    Cuando ella abre la lista de usuarios
    Y ella empieza a suspender al operador de CI pero cancela
    Entonces el operador de CI sigue "Activo"

  Escenario: Un operador no puede administrar usuarios ni escribiendo la URL
    Dado que Óscar inició sesión como operador
    Cuando él va a "/admin/users"
    Entonces él ve el aviso "No tienes acceso a esta sección."
