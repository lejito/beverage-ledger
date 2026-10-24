# language: es
@web @rf-30
Característica: RF-30 · Log de auditoría
  Para poder responder quién hizo qué, cuándo y desde dónde
  como administradora
  quiero consultar el log de auditoría y filtrarlo

  Escenario: El log muestra quién, qué y cuándo
    Dado que Ana inició sesión como administradora
    Cuando ella abre el log de auditoría
    Entonces ella ve las columnas "Cuándo", "Quién" y "Acción"

  Escenario: Filtrar por productos muestra las ediciones de productos
    Dado que Ana inició sesión como administradora
    Cuando ella abre el log de auditoría
    Y ella filtra por la entidad "Productos"
    Entonces ella ve el mensaje "Producto editado"

  Escenario: Un manager no tiene el log a su alcance
    Dado que Marta inició sesión como manager
    Cuando ella va a "/admin/audit"
    Entonces ella ve el aviso "No tienes acceso a esta sección."
