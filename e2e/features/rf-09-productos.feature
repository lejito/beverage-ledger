# language: es
@web @rf-09
Característica: RF-09 · Gestión de productos
  Para que los movimientos se registren contra un catálogo correcto
  como administradora
  quiero encontrar y editar los productos, sin aceptar valores imposibles

  Todo se hace sobre el producto fijo de CI, que se deja como estaba.

  Antecedentes:
    Dado que Ana inició sesión como administradora

  Escenario: La búsqueda encuentra un producto por su nombre
    Cuando ella busca "[CI] Producto de prueba" en el catálogo
    Entonces ella ve solamente los productos:
      | [CI] Producto de prueba |

  @restaura-producto
  Escenario: Editar la existencia mínima se guarda y se anuncia
    Cuando ella fija la existencia mínima de "[CI] Producto de prueba" en "7"
    Entonces ella ve el aviso "Producto actualizado"
    Y la fila de "[CI] Producto de prueba" muestra "7"

  Escenario: Una existencia mínima negativa se señala y no se guarda
    Cuando ella intenta fijar la existencia mínima de "[CI] Producto de prueba" en "-1"
    Entonces ella ve el mensaje "Tiene que ser 0 o más."
