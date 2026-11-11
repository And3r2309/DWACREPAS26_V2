// JS/app.js
const llave = "crepasvibes_v2";
const inicio = {
  productos: [
    {
      id: 1,
      nombre: "Base Tradicional",
      precio: 2.5,
      stock: 50,
      min: 10,
      categoria: "base",
    },
    {
      id: 2,
      nombre: "Base Avena",
      precio: 3.0,
      stock: 40,
      min: 10,
      categoria: "base",
    },
    {
      id: 3,
      nombre: "Fresa",
      precio: 0.5,
      stock: 30,
      min: 5,
      categoria: "ingrediente",
    },
    {
      id: 4,
      nombre: "Plátano",
      precio: 0.5,
      stock: 30,
      min: 5,
      categoria: "ingrediente",
    },
    {
      id: 5,
      nombre: "Nutella",
      precio: 1.0,
      stock: 20,
      min: 5,
      categoria: "cubierta",
    },
    {
      id: 6,
      nombre: "Lechera",
      precio: 0.75,
      stock: 20,
      min: 5,
      categoria: "cubierta",
    },
    {
      id: 7,
      nombre: "Crepa Nutella + Guineo",
      precio: 2.0,
      stock: 15,
      min: 5,
      categoria: "prearmada",
      imagen: "IMG/NUTELLAYGUINEO.jpg",
    },
    {
      id: 8,
      nombre: "Crepa Nutella + Fresas",
      precio: 2.5,
      stock: 12,
      min: 5,
      categoria: "prearmada",
      imagen: "IMG/NUTELLAFRESA.jpg",
    },
    {
      id: 9,
      nombre: "Crepa Chocolate",
      precio: 2.25,
      stock: 10,
      min: 5,
      categoria: "prearmada",
      imagen: "IMG/CREPACHOCOLATE.jpg",
    },
    {
      id: 10,
      nombre: "Crepa de Manzana",
      precio: 2.75,
      stock: 9,
      min: 5,
      categoria: "prearmada",
      imagen: "IMG/CREPAMANZANA.jpg",
    },
    {
      id: 11,
      nombre: "Crepa de Oreo",
      precio: 3.0,
      stock: 8,
      min: 5,
      categoria: "prearmada",
      imagen: "IMG/CREPAOREO.jpg",
    },
    {
      id: 12,
      nombre: "Crepa Clásica",
      precio: 1.75,
      stock: 20,
      min: 5,
      categoria: "prearmada",
      imagen: "IMG/CREPACLASICA.jpg",
    },
  ],
  pedidos: [],
  movimientos: [],
  numero: 1,
  catalogoPrearmadasInicializado: true,
};

function clonar(valor) {
  return JSON.parse(JSON.stringify(valor));
}

function normalizarDatos(d) {
  let cambio = false;
  if (!d || typeof d !== "object" || Array.isArray(d)) {
    return { datos: clonar(inicio), cambio: true };
  }
  if (!Array.isArray(d.productos)) {
    d.productos = clonar(inicio.productos);
    cambio = true;
  }
  if (!Array.isArray(d.pedidos)) {
    d.pedidos = [];
    cambio = true;
  }
  if (!Array.isArray(d.movimientos)) {
    d.movimientos = [];
    cambio = true;
  }

  // Agrega rutas de fotos al catálogo que ya estaba guardado en el navegador.
  // Así no es necesario borrar pedidos ni inventario existentes para verlas.
  inicio.productos
    .filter((producto) => producto.imagen)
    .forEach((plantilla) => {
      const producto = d.productos.find(
        (actual) =>
          actual.categoria === "prearmada" &&
          (actual.id === plantilla.id || actual.nombre === plantilla.nombre),
      );
      if (producto && !producto.imagen) {
        producto.imagen = plantilla.imagen;
        cambio = true;
      }
    });

  // Migra el catálogo una sola vez para no restaurar productos que
  // administración haya eliminado intencionalmente después de la migración.
  if (d.catalogoPrearmadasInicializado !== true) {
    if (!d.productos.some((p) => p.categoria === "prearmada")) {
      let siguienteId =
        Math.max(0, ...d.productos.map((p) => Number(p.id) || 0)) + 1;
      inicio.productos
        .filter((p) => p.categoria === "prearmada")
        .forEach((p) => d.productos.push({ ...p, id: siguienteId++ }));
    }
    d.catalogoPrearmadasInicializado = true;
    cambio = true;
  }

  const siguientePedido =
    Math.max(0, ...d.pedidos.map((p) => Number(p.id) || 0)) + 1;
  if (!Number.isInteger(d.numero) || d.numero < siguientePedido) {
    d.numero = siguientePedido;
    cambio = true;
  }
  return { datos: d, cambio };
}

function datos() {
  try {
    return normalizarDatos(
      JSON.parse(localStorage.getItem(llave)) || clonar(inicio),
    ).datos;
  } catch (e) {
    return clonar(inicio);
  }
}
function guardar(d) {
  localStorage.setItem(llave, JSON.stringify(d));
}

async function inicializarDatos() {
  let d = null;
  try {
    const guardados = localStorage.getItem(llave);
    d = guardados ? JSON.parse(guardados) : null;
  } catch (e) {
    d = null;
  }

  if (!d) {
    try {
      const respuesta = await fetch(base + "Datos/productos.json");
      if (!respuesta.ok)
        throw new Error("No se pudo cargar el catálogo inicial");
      d = await respuesta.json();
    } catch (e) {
      d = clonar(inicio);
    }
  }

  const resultado = normalizarDatos(d);
  guardar(resultado.datos);
}

let carrito = [];
function registrarMovimiento(d, p, cantidad, tipo, referencia) {
  (d.movimientos ||= []).push({
    fecha: new Date().toISOString(),
    producto: p.nombre,
    tipo,
    cantidad,
    referencia,
    stockFinal: p.stock,
  });
}

function armarCrepa(e) {
  e.preventDefault();
  let d = datos();
  let idBase = Number(document.getElementById("sel-base").value);
  let idCubierta = Number(document.getElementById("sel-cubierta").value);
  let chks = Array.from(
    document.querySelectorAll(".chk-ingrediente:checked"),
  ).map((x) => Number(x.value));

  if (chks.length > 2)
    return avisar("Solo puedes seleccionar un máximo de 2 ingredientes extra.");

  let itemsSeleccionados = [idBase, idCubierta, ...chks];
  let nombresItems = [];
  let totalPrecio = 0;

  for (let id of itemsSeleccionados) {
    let p = d.productos.find((x) => x.id === id);
    if (!p || p.stock < 1)
      return avisar(
        `Sin existencias de: ${p ? p.nombre : "Elemento desconocido"}`,
      );
    nombresItems.push(p.nombre);
    totalPrecio += p.precio;
  }

  carrito.push({
    idTemporal: Date.now(),
    descripcion: `Crepa: ${nombresItems.join(", ")}`,
    precioUnitario: totalPrecio,
    elementosBase: itemsSeleccionados, // Guarda todos los IDs usados
    cantidad: 1,
  });
  mostrarCarrito();
  document.getElementById("form-crepa").reset();
  actualizarVistaCrepa();
}

function mostrarCarrito() {
  document.getElementById("carrito").innerHTML =
    carrito
      .map(
        (i) => `
        <div class="mb-2 border-bottom pb-2">
            <p class="mb-1">${escapar(i.descripcion)}</p>
            <strong>x${i.cantidad} - ${precio(i.precioUnitario * i.cantidad)}</strong>
            <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="quitar(${i.idTemporal})">Quitar</button>
        </div>
    `,
      )
      .join("") || "<p>Carrito vacío</p>";
  calcularTotal();
}

function quitar(idTemporal) {
  carrito = carrito.filter((x) => x.idTemporal !== idTemporal);
  mostrarCarrito();
}

function agregarDesdeCatalogo(id) {
  const p = datos().productos.find((x) => x.id === id);
  if (!p) return avisar("Producto no encontrado");
  if (p.stock < 1) return avisar("Sin existencias de este producto");

  carrito.push({
    idTemporal: Date.now() + Math.random(),
    descripcion: p.nombre,
    precioUnitario: p.precio,
    elementosBase: [p.id],
    cantidad: 1,
  });
  mostrarCarrito();
  avisar(`¡${p.nombre} agregado al carrito!`);
}

function costo(z) {
  return (
    { "Santa Tecla": 0.5, "Ciudad Merliot": 1, "Antiguo Cuscatlán": 1.5 }[z] ||
    0
  );
}

function calcularTotal() {
  const subtotal = carrito.reduce(
    (suma, item) => suma + item.precioUnitario * item.cantidad,
    0,
  );
  const zona = document.getElementById("zona");
  const envio = zona ? costo(zona.value) : 0;
  const resumen = document.getElementById("resumen-total");
  if (!resumen) return;

  resumen.classList.toggle("d-none", carrito.length === 0);
  if (carrito.length) {
    document.getElementById("lbl-subtotal").textContent = precio(subtotal);
    document.getElementById("lbl-envio").textContent = precio(envio);
    document.getElementById("lbl-total").textContent = precio(subtotal + envio);
  }
}

function actualizarValidacion(campo) {
  if (!campo) return;
  const mostrarEstado = campo.value.trim() !== "" || campo.required;
  campo.classList.toggle("is-valid", mostrarEstado && campo.checkValidity());
  campo.classList.toggle("is-invalid", mostrarEstado && !campo.checkValidity());
}

function configurarFormularioCompra() {
  const form = document.getElementById("compra");
  const zona = document.getElementById("zona");
  const direccion = document.getElementById("direccion");
  const etiquetaDireccion = document.getElementById("etiqueta-direccion");
  if (!form || !zona || !direccion) return;

  const actualizarEntrega = () => {
    const requiereDireccion = zona.value !== "Retiro en tienda";
    direccion.required = requiereDireccion;
    etiquetaDireccion.textContent = requiereDireccion
      ? "Dirección de entrega"
      : "Dirección (opcional)";
    actualizarValidacion(direccion);
    calcularTotal();
  };

  form.querySelectorAll("input").forEach((campo) => {
    campo.addEventListener("input", () => actualizarValidacion(campo));
    campo.addEventListener("blur", () => actualizarValidacion(campo));
  });
  zona.addEventListener("change", actualizarEntrega);
  actualizarEntrega();
}

function validarContacto(contacto) {
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'-]+$/.test(contacto.nombre))
    return "Ingresa un nombre válido.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacto.correo))
    return "Ingresa un correo válido.";
  if (!/^\d{4}-\d{4}$/.test(contacto.telefono))
    return "El teléfono debe tener el formato 7777-7777.";
  return "";
}

function comprar(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const contacto = {
    nombre: document.getElementById("cli-nombre").value.trim(),
    correo: document.getElementById("cli-correo").value.trim().toLowerCase(),
    telefono: document.getElementById("cli-telefono").value.trim(),
  };
  const zona = document.getElementById("zona").value;
  const direccion = document.getElementById("direccion").value.trim();
  const errorContacto = validarContacto(contacto);
  if (!form.checkValidity() || errorContacto) {
    form.classList.add("was-validated");
    return avisar(
      errorContacto || "Completa correctamente los datos del pedido.",
    );
  }

  let err = pedido(contacto, carrito, zona, direccion, sesion()?.correo);
  if (err) return avisar(err);
  carrito = [];
  avisar("Pedido registrado exitosamente");
  location.reload();
}

function pedido(contacto, items, z, dir, usuarioCorreo) {
  let d = datos();
  if (!items.length) return "Agrega productos al carrito";
  const errorContacto = validarContacto(contacto);
  if (errorContacto) return errorContacto;
  if (z !== "Retiro en tienda" && !dir.trim()) return "Falta dirección";

  // 1. Sumar cuánto se necesita de cada ingrediente en TODO el pedido.
  //    Antes se validaba cada crepa del carrito por separado contra el
  //    stock original, así que dos crepas que usaran el mismo ingrediente
  //    podían "pasar" la validación aunque juntas superaran el stock
  //    disponible (y el stock podía terminar en negativo).
  let demanda = {};
  for (let i of items) {
    for (let id of i.elementosBase) {
      demanda[id] = (demanda[id] || 0) + i.cantidad;
    }
  }

  // 2. Validar existencias contra la demanda total ya sumada
  for (let id in demanda) {
    let p = d.productos.find((x) => x.id === Number(id));
    if (!p || p.stock < demanda[id])
      return `Sin existencias suficientes de: ${p ? p.nombre : "ingrediente"}`;
  }

  // 3. Descontar del inventario y calcular total
  let subtotal = 0;
  let detalle = items.map((i) => {
    i.elementosBase.forEach((id) => {
      let p = d.productos.find((x) => x.id === id);
      p.stock -= i.cantidad;
      registrarMovimiento(d, p, -i.cantidad, "Venta", "Pedido #" + d.numero);
    });
    subtotal += i.precioUnitario * i.cantidad;
    return {
      id: i.idTemporal,
      nombre: i.descripcion,
      cantidad: i.cantidad,
      precio: i.precioUnitario,
    };
  });

  d.pedidos.push({
    id: d.numero++,
    cliente: contacto.nombre,
    correo: contacto.correo,
    telefono: contacto.telefono,
    usuarioCorreo: String(usuarioCorreo || contacto.correo)
      .trim()
      .toLowerCase(),
    items: detalle,
    consumos: demanda,
    total: Math.round((subtotal + costo(z)) * 100) / 100,
    entrega: z,
    direccion: dir,
    estado: "Pendiente",
    fecha: new Date().toISOString(),
  });
  guardar(d);
  return "";
}

// ---------- Utilidades de presentación para el panel de administrador ----------

function capitalizar(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function colorEstado(estado) {
  return (
    {
      Pendiente: "warning",
      "En preparación": "info",
      Entregado: "success",
      Cancelado: "danger",
    }[estado] || "secondary"
  );
}

function opcionesEstado(actual) {
  return ["Pendiente", "En preparación", "Entregado", "Cancelado"]
    .map(
      (e) =>
        `<option value="${e}" ${e === actual ? "selected" : ""}>${e}</option>`,
    )
    .join("");
}

function formatearFecha(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("es-SV", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (e) {
    return "-";
  }
}

function ordenarProductos(lista) {
  const orden = { base: 0, ingrediente: 1, cubierta: 2, prearmada: 3 };
  return lista
    .slice()
    .sort(
      (a, b) =>
        (orden[a.categoria] ?? 9) - (orden[b.categoria] ?? 9) ||
        a.nombre.localeCompare(b.nombre, "es"),
    );
}

// ---------- Productos: alta, edición y borrado ----------

function abrirModalProducto(id) {
  let d = datos();
  let p = id ? d.productos.find((x) => x.id === id) : null;
  document.getElementById("modalProductoTitulo").textContent = p
    ? "Editar producto"
    : "Nuevo producto";
  document.getElementById("prod-id").value = p ? p.id : "";
  document.getElementById("prod-nombre").value = p ? p.nombre : "";
  document.getElementById("prod-categoria").value = p ? p.categoria : "base";
  document.getElementById("prod-precio").value = p ? p.precio : "";
  document.getElementById("prod-stock").value = p ? p.stock : 0;
  document.getElementById("prod-min").value = p ? p.min : 5;
  new bootstrap.Modal(document.getElementById("modalProducto")).show();
}

function guardarProducto(e) {
  e.preventDefault();
  let id = document.getElementById("prod-id").value;
  let nombre = document.getElementById("prod-nombre").value.trim();
  let categoria = document.getElementById("prod-categoria").value;
  let precioNuevo = Number(document.getElementById("prod-precio").value);
  let stockNuevo = Number(document.getElementById("prod-stock").value);
  let minNuevo = Number(document.getElementById("prod-min").value);

  if (!nombre) return avisar("El nombre es obligatorio");
  if (!(precioNuevo > 0)) return avisar("El precio debe ser mayor a 0");
  if (stockNuevo < 0 || minNuevo < 0)
    return avisar("El stock y el mínimo no pueden ser negativos");

  let d = datos();
  const stockAnterior = id
    ? (d.productos.find((x) => x.id === Number(id))?.stock ?? 0)
    : 0;
  if (id) {
    let p = d.productos.find((x) => x.id === Number(id));
    if (p) {
      p.nombre = nombre;
      p.categoria = categoria;
      p.precio = precioNuevo;
      p.stock = stockNuevo;
      p.min = minNuevo;
    }
  } else {
    let nuevoId = d.productos.length
      ? Math.max(...d.productos.map((x) => x.id)) + 1
      : 1;
    d.productos.push({
      id: nuevoId,
      nombre,
      categoria,
      precio: precioNuevo,
      stock: stockNuevo,
      min: minNuevo,
    });
  }
  const editado = id
    ? d.productos.find((x) => x.id === Number(id))
    : d.productos[d.productos.length - 1];
  if (editado && editado.stock !== stockAnterior)
    registrarMovimiento(
      d,
      editado,
      editado.stock - stockAnterior,
      "Ajuste",
      "Edición de producto",
    );
  guardar(d);

  // Esperamos a que el modal termine de cerrarse (evento hidden.bs.modal)
  // antes de volver a dibujar #contenido; así Bootstrap limpia su backdrop
  // correctamente en vez de perder la referencia al modal a medio cerrar.
  let modalEl = document.getElementById("modalProducto");
  modalEl.addEventListener("hidden.bs.modal", () => contenido(), {
    once: true,
  });
  bootstrap.Modal.getInstance(modalEl).hide();
}

function eliminarProducto(id) {
  let d = datos();
  let p = d.productos.find((x) => x.id === id);
  if (!p) return;
  if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`))
    return;
  d.productos = d.productos.filter((x) => x.id !== id);
  guardar(d);
  contenido();
}

// ---------- Inventario: reabastecer ----------

function reabastecer(id) {
  let input = document.getElementById("cant-" + id);
  let cant = Number(input.value);
  if (!cant || cant < 1) return avisar("Ingresa una cantidad válida");
  let d = datos();
  let p = d.productos.find((x) => x.id === id);
  if (!p) return;
  p.stock += cant;
  registrarMovimiento(d, p, cant, "Entrada", "Reabastecimiento");
  guardar(d);
  avisar(
    `Se agregaron ${cant} unidades a ${p.nombre}. Stock actual: ${p.stock}.`,
  );
  contenido();
}

// ---------- Pedidos: cambiar estado ----------

function cambiarEstado(id, nuevo) {
  let d = datos();
  let ped = d.pedidos.find((x) => x.id === id);
  if (!ped) return;
  if (ped.estado === nuevo) return;
  if (nuevo === "Cancelado") {
    if (!ped.consumos)
      return avisar(
        "Pedido antiguo sin detalle de consumos: ajusta inventario manualmente antes de cancelar.",
      );
    for (const [id, cantidad] of Object.entries(ped.consumos)) {
      const p = d.productos.find((x) => x.id === Number(id));
      if (p) {
        p.stock += cantidad;
        registrarMovimiento(d, p, cantidad, "Devolución", "Pedido #" + ped.id);
      }
    }
  }
  if (ped.estado === "Cancelado")
    return avisar("No se puede reactivar un pedido cancelado.");
  ped.estado = nuevo;
  guardar(d);
  contenido();
}

function normalizarCorreo(correo) {
  return String(correo || "")
    .trim()
    .toLowerCase();
}

function esPedidoDelUsuario(pedido, usuario) {
  const correoUsuario = normalizarCorreo(usuario?.correo);
  if (!correoUsuario) return false;

  const propietario = normalizarCorreo(pedido.usuarioCorreo);
  if (propietario) return propietario === correoUsuario;

  // Compatibilidad con pedidos creados antes de guardar una identidad de sesión.
  const correoContacto = normalizarCorreo(pedido.correo);
  return correoContacto
    ? correoContacto === correoUsuario
    : pedido.cliente === usuario.nombre;
}

function actualizarMisPedidos() {
  const usuario = sesion();
  const badge = document.getElementById("badge-pedidos");
  if (!badge || usuario?.rol !== "cliente") return;

  const activos = datos().pedidos.filter(
    (pedido) =>
      esPedidoDelUsuario(pedido, usuario) &&
      ["Pendiente", "En preparación"].includes(pedido.estado),
  );
  badge.textContent = activos.length;
  badge.classList.toggle("d-none", activos.length === 0);
}

function contenido() {
  let p = document.body.dataset.pagina,
    a = document.getElementById("contenido"),
    d = datos();

  if (p === "login") {
    document.getElementById("formLogin").onsubmit = entrar;
    return;
  }
  if (p === "inicio") return;
  if (
    ["resumen", "productos", "inventario", "ventas", "pedidos"].includes(p) &&
    !revisar("admin")
  )
    return;
  if (["tienda", "mis"].includes(p) && !revisar("cliente")) return;

  if (p === "tienda") {
    let bases = d.productos.filter((x) => x.categoria === "base");
    let ingredientes = d.productos.filter((x) => x.categoria === "ingrediente");
    let cubiertas = d.productos.filter((x) => x.categoria === "cubierta");
    let prearmadas = d.productos.filter((x) => x.categoria === "prearmada");
    const u = sesion();

    a.innerHTML = `
            <section class="mb-5" aria-labelledby="titulo-catalogo">
                <h1 id="titulo-catalogo" class="titulo mb-4">Catálogo de crepas</h1>
                <div class="row g-4">
                    ${prearmadas
                      .map(
                        (c) => `
                                <div class="col-sm-6 col-lg-4">
                                    <article class="card catalogo-card h-100 overflow-hidden">
                                        <div class="catalogo-top-bg">
                                            <img class="catalogo-imagen" src="${base}${escapar(c.imagen)}" alt="${escapar(c.nombre)}" loading="lazy">
                                        </div>
                                        <div class="card-body d-flex flex-column">
                                            <h2 class="h5 card-title fw-bold">${escapar(c.nombre)}</h2>
                                            <p class="text-muted small">${c.stock > 0 ? `Disponibles: ${c.stock}` : "Agotada"}</p>
                                            <div class="d-flex justify-content-between align-items-center mt-auto gap-2">
                                                <span class="fs-5 fw-bold">${precio(c.precio)}</span>
                                                <button type="button" class="btn btn-crepa btn-sm rounded-pill px-3" onclick="agregarDesdeCatalogo(${c.id})" ${c.stock > 0 ? "" : "disabled"}>Agregar</button>
                                            </div>
                                        </div>
                                    </article>
                                </div>`,
                      )
                      .join("")}
                </div>
            </section>

            <h2 class="titulo mb-4">Arma tu Crepa</h2>
            <div class="row g-4">
                <div class="col-md-7">
                    <form id="form-crepa" class="card p-4 shadow-sm border-0">
                        <h5 class="mb-3">1. Base</h5>
                        <select id="sel-base" class="form-select mb-4">
                            ${bases.map((x) => `<option value="${x.id}">${escapar(x.nombre)} - ${precio(x.precio)}</option>`).join("")}
                        </select>
                        <h5 class="mb-3">2. Ingredientes (Máx 2)</h5>
                        <div class="mb-4">
                            ${ingredientes
                              .map(
                                (x) => `
                                <div class="form-check">
                                    <input class="form-check-input chk-ingrediente" type="checkbox" value="${x.id}" id="ing-${x.id}">
                                    <label class="form-check-label" for="ing-${x.id}">${escapar(x.nombre)} - ${precio(x.precio)}</label>
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                        <h5 class="mb-3">3. Cubierta</h5>
                        <select id="sel-cubierta" class="form-select mb-4">
                            ${cubiertas.map((x) => `<option value="${x.id}">${escapar(x.nombre)} - ${precio(x.precio)}</option>`).join("")}
                        </select>
                        <div id="vista-crepa" class="vista-crepa text-center mb-4" aria-live="polite"></div>
                        <button type="submit" class="btn btn-crepa w-100">Agregar al carrito</button>
                    </form>
                </div>
                <div class="col-md-5">
                    <div class="card p-4 shadow-sm border-0">
                        <h3>Mi Carrito</h3>
                        <div id="carrito"></div>

                        <div id="resumen-total" class="mt-3 border-top pt-3 d-none" aria-live="polite">
                            <div class="d-flex justify-content-between mb-1 text-muted small"><span>Subtotal:</span><span id="lbl-subtotal">$0.00</span></div>
                            <div class="d-flex justify-content-between mb-2 text-muted small"><span>Costo de envío:</span><span id="lbl-envio">$0.00</span></div>
                            <div class="d-flex justify-content-between fs-5 fw-bold"><span>Total a pagar:</span><span id="lbl-total" class="text-success">$0.00</span></div>
                        </div>

                        <form id="compra" class="mt-4" novalidate>
                            <h4 class="h5 mb-3">Datos de contacto</h4>
                            <div class="mb-3">
                                <label for="cli-nombre" class="form-label">Nombre completo</label>
                                <input type="text" id="cli-nombre" class="form-control" value="${escapar(u?.nombre || "")}" autocomplete="name" required pattern="[A-Za-zÁÉÍÓÚáéíóúÑñ '-]+">
                                <div class="invalid-feedback">Ingresa solo letras, espacios, apóstrofes o guiones.</div>
                            </div>
                            <div class="mb-3">
                                <label for="cli-correo" class="form-label">Correo electrónico</label>
                                <input type="email" id="cli-correo" class="form-control" value="${escapar(u?.correo || "")}" autocomplete="email" required>
                                <div class="invalid-feedback">Ingresa un correo válido.</div>
                            </div>
                            <div class="mb-3">
                                <label for="cli-telefono" class="form-label">Teléfono</label>
                                <input type="tel" id="cli-telefono" class="form-control" placeholder="7777-7777" autocomplete="tel" required pattern="[0-9]{4}-[0-9]{4}">
                                <div class="invalid-feedback">Usa el formato 7777-7777.</div>
                            </div>
                            <label for="zona" class="form-label">Entrega</label>
                            <select id="zona" class="form-select mb-3">${zonas()}</select>
                            <label id="etiqueta-direccion" for="direccion" class="form-label">Dirección de entrega</label>
                            <input id="direccion" class="form-control mb-3" autocomplete="street-address">
                            <div class="invalid-feedback">Ingresa una dirección para la entrega.</div>
                            <button class="btn btn-success w-100 fw-bold">Confirmar Pedido</button>
                        </form>
                    </div>
                </div>
            </div>`;
    mostrarCarrito();
    document
      .getElementById("form-crepa")
      .addEventListener("change", actualizarVistaCrepa);
    actualizarVistaCrepa();
    document.getElementById("form-crepa").onsubmit = armarCrepa;
    document.getElementById("compra").onsubmit = comprar;
    configurarFormularioCompra();
  }

  if (p === "mis") {
    const usuario = sesion();
    a.innerHTML = `<h1 class="titulo">Mis pedidos</h1>
            ${
              d.pedidos
                .filter((x) => esPedidoDelUsuario(x, usuario))
                .sort((a, b) => b.id - a.id)
                .map(
                  (x) => `
            <div class="card p-3 mb-3 shadow-sm border-0">
                <h5>Pedido #${x.id} - <span class="badge text-bg-${colorEstado(x.estado)}">${escapar(x.estado)}</span></h5>
                <p class="mb-1 text-muted">${x.items.map((i) => escapar(i.nombre) + " x" + i.cantidad).join("<br>")}</p>
                <p class="mb-1 small text-muted">${formatearFecha(x.fecha)}</p>
                <b class="fs-5">${precio(x.total)}</b>
            </div>`,
                )
                .join("") || "<p>Todavía no tienes pedidos.</p>"
            }`;
  }

  if (p === "resumen") {
    let totalIngresos = d.pedidos
      .filter((x) => x.estado !== "Cancelado")
      .reduce((s, x) => s + x.total, 0);
    let totalPedidos = d.pedidos.length;
    let activos = d.pedidos.filter((x) =>
      ["Pendiente", "En preparación"].includes(x.estado),
    ).length;
    let stockBajo = d.productos.filter((x) => x.stock <= x.min);
    let ultimos = d.pedidos
      .slice()
      .sort((a, b) => b.id - a.id)
      .slice(0, 5);

    a.innerHTML = `
            <h1 class="titulo mb-4">Resumen</h1>
            <div class="row g-3 mb-4">
                <div class="col-6 col-md-3">
                    <div class="card p-3 text-center shadow-sm border-0">
                        <div class="text-muted small">Ingresos totales</div>
                        <div class="fs-3 fw-bold titulo">${precio(totalIngresos)}</div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card p-3 text-center shadow-sm border-0">
                        <div class="text-muted small">Pedidos totales</div>
                        <div class="fs-3 fw-bold titulo">${totalPedidos}</div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card p-3 text-center shadow-sm border-0">
                        <div class="text-muted small">Pedidos activos</div>
                        <div class="fs-3 fw-bold titulo">${activos}</div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card p-3 text-center shadow-sm border-0">
                        <div class="text-muted small">Stock bajo</div>
                        <div class="fs-3 fw-bold ${stockBajo.length ? "text-danger" : "titulo"}">${stockBajo.length}</div>
                    </div>
                </div>
            </div>
            <div class="row g-4">
                <div class="col-md-7">
                    <div class="card p-3 shadow-sm border-0">
                        <h5 class="mb-3 d-flex justify-content-between align-items-center">Últimos pedidos <a href="pedidos.html" class="small">Ver todos →</a></h5>
                        ${
                          ultimos.length
                            ? `<div class="table-responsive">
                                <table class="table table-sm align-middle mb-0">
                                    <thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead>
                                    <tbody>
                                        ${ultimos.map((x) => `<tr><td>#${x.id}</td><td>${escapar(x.cliente)}</td><td>${precio(x.total)}</td><td><span class="badge text-bg-${colorEstado(x.estado)}">${escapar(x.estado)}</span></td></tr>`).join("")}
                                    </tbody>
                                </table>
                            </div>`
                            : '<p class="text-muted mb-0">Todavía no hay pedidos.</p>'
                        }
                    </div>
                </div>
                <div class="col-md-5">
                    <div class="card p-3 shadow-sm border-0">
                        <h5 class="mb-3 d-flex justify-content-between align-items-center">Alertas de inventario <a href="inventario.html" class="small">Ver inventario →</a></h5>
                        ${
                          stockBajo.length
                            ? `<ul class="list-unstyled mb-0">
                                ${stockBajo.map((x) => `<li class="d-flex justify-content-between border-bottom py-2"><span>${escapar(x.nombre)}</span><span class="badge text-bg-${x.stock === 0 ? "danger" : "warning"}">${x.stock} / mín. ${x.min}</span></li>`).join("")}
                            </ul>`
                            : '<p class="text-muted mb-0">Todo el inventario está en buen nivel.</p>'
                        }
                    </div>
                </div>
            </div>`;
  }

  if (p === "productos") {
    a.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <h1 class="titulo mb-0">Productos</h1>
                <button class="btn btn-crepa" onclick="abrirModalProducto(null)">+ Nuevo producto</button>
            </div>
            <div class="table-responsive">
                <table class="table align-middle">
                    <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Mínimo</th><th></th></tr></thead>
                    <tbody>
                        ${ordenarProductos(d.productos)
                          .map(
                            (x) => `
                        <tr>
                            <td>${escapar(x.nombre)}</td>
                            <td><span class="badge text-bg-light border">${escapar(capitalizar(x.categoria))}</span></td>
                            <td>${precio(x.precio)}</td>
                            <td>${x.stock}</td>
                            <td>${x.min}</td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-outline-secondary" onclick="abrirModalProducto(${x.id})">Editar</button>
                                <button class="btn btn-sm btn-outline-danger" onclick="eliminarProducto(${x.id})">Eliminar</button>
                            </td>
                        </tr>`,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>

            <div class="modal fade" id="modalProducto" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <form id="form-producto">
                            <div class="modal-header">
                                <h5 class="modal-title" id="modalProductoTitulo">Nuevo producto</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                            </div>
                            <div class="modal-body">
                                <input type="hidden" id="prod-id">
                                <div class="mb-3">
                                    <label for="prod-nombre" class="form-label">Nombre</label>
                                    <input id="prod-nombre" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label for="prod-categoria" class="form-label">Categoría</label>
                                    <select id="prod-categoria" class="form-select">
                                        <option value="base">Base</option>
                                        <option value="ingrediente">Ingrediente</option>
                                        <option value="cubierta">Cubierta</option>
                                        <option value="prearmada">Crepa prearmada</option>
                                    </select>
                                </div>
                                <div class="row">
                                    <div class="col-4 mb-3">
                                        <label for="prod-precio" class="form-label">Precio ($)</label>
                                        <input id="prod-precio" type="number" step="0.01" min="0.01" class="form-control" required>
                                    </div>
                                    <div class="col-4 mb-3">
                                        <label for="prod-stock" class="form-label">Stock</label>
                                        <input id="prod-stock" type="number" min="0" class="form-control" required>
                                    </div>
                                    <div class="col-4 mb-3">
                                        <label for="prod-min" class="form-label">Mínimo</label>
                                        <input id="prod-min" type="number" min="0" class="form-control" required>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                <button type="submit" class="btn btn-crepa">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;
    document.getElementById("form-producto").onsubmit = guardarProducto;
  }

  if (p === "inventario") {
    let bajo = d.productos.filter((x) => x.stock <= x.min);
    a.innerHTML = `
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4"><h1 class="titulo mb-0">Inventario</h1><div class="d-flex gap-2"><button class="btn btn-outline-secondary btn-sm" onclick="exportarInventario()">CSV</button><button class="btn btn-outline-secondary btn-sm" onclick="exportarMovimientos()">Movimientos CSV</button><button class="btn btn-crepa btn-sm" onclick="imprimirReporte('inventario')">PDF / Imprimir</button></div></div>
            ${
              bajo.length
                ? `<div class="alert alert-warning">⚠️ ${bajo.length} producto${bajo.length > 1 ? "s" : ""} con poco stock o agotado${bajo.length > 1 ? "s" : ""}.</div>`
                : ""
            }
            <div class="table-responsive">
                <table class="table align-middle">
                    <thead><tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Mínimo</th><th>Estado</th><th>Reabastecer</th></tr></thead>
                    <tbody>
                        ${ordenarProductos(d.productos)
                          .map(
                            (x) => `
                        <tr class="${x.stock === 0 ? "table-danger" : x.stock <= x.min ? "table-warning" : ""}">
                            <td>${escapar(x.nombre)}</td>
                            <td><span class="badge text-bg-light border">${escapar(capitalizar(x.categoria))}</span></td>
                            <td>${x.stock}</td>
                            <td>${x.min}</td>
                            <td><span class="badge text-bg-${x.stock === 0 ? "danger" : x.stock <= x.min ? "warning" : "success"}">${x.stock === 0 ? "Agotado" : x.stock <= x.min ? "Stock bajo" : "OK"}</span></td>
                            <td>
                                <div class="input-group input-group-sm" style="max-width:170px">
                                    <input type="number" min="1" value="10" id="cant-${x.id}" class="form-control">
                                    <button class="btn btn-outline-secondary" type="button" onclick="reabastecer(${x.id})">Agregar</button>
                                </div>
                            </td>
                        </tr>`,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            <h2 class="h5 titulo mt-4">Historial de movimientos</h2>
            <div class="table-responsive"><table class="table table-sm"><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Referencia</th><th>Stock final</th></tr></thead><tbody>
            ${
              (d.movimientos || [])
                .slice(-20)
                .reverse()
                .map(
                  (m) =>
                    "<tr><td>" +
                    formatearFecha(m.fecha) +
                    "</td><td>" +
                    escapar(m.producto) +
                    "</td><td>" +
                    escapar(m.tipo) +
                    "</td><td>" +
                    m.cantidad +
                    "</td><td>" +
                    escapar(m.referencia) +
                    "</td><td>" +
                    m.stockFinal +
                    "</td></tr>",
                )
                .join("") ||
              '<tr><td colspan="6">Sin movimientos registrados</td></tr>'
            }
            </tbody></table></div>`;
  }

  if (p === "ventas") {
    let validos = d.pedidos.filter((x) => x.estado !== "Cancelado");
    let totalIngresos = validos.reduce((s, x) => s + x.total, 0);
    let totalPedidos = d.pedidos.length;
    let cancelados = d.pedidos.filter((x) => x.estado === "Cancelado").length;
    let ticketPromedio = validos.length ? totalIngresos / validos.length : 0;

    let zonasVentas = {};
    validos.forEach((x) => {
      zonasVentas[x.entrega] = (zonasVentas[x.entrega] || 0) + x.total;
    });
    let maxZona = Math.max(1, ...Object.values(zonasVentas));

    let estadosPedidos = {};
    d.pedidos.forEach((x) => {
      estadosPedidos[x.estado] = (estadosPedidos[x.estado] || 0) + 1;
    });

    a.innerHTML = `
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4"><h1 class="titulo mb-0">Ventas</h1><div class="d-flex gap-2"><button class="btn btn-outline-secondary btn-sm" onclick="exportarVentas()">CSV</button><button class="btn btn-crepa btn-sm" onclick="imprimirReporte('ventas')">PDF / Imprimir</button></div></div>
            <div class="row g-3 mb-4">
                <div class="col-6 col-md-3">
                    <div class="card p-3 text-center shadow-sm border-0">
                        <div class="text-muted small">Ingresos totales</div>
                        <div class="fs-3 fw-bold titulo">${precio(totalIngresos)}</div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card p-3 text-center shadow-sm border-0">
                        <div class="text-muted small">Pedidos totales</div>
                        <div class="fs-3 fw-bold titulo">${totalPedidos}</div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card p-3 text-center shadow-sm border-0">
                        <div class="text-muted small">Ticket promedio</div>
                        <div class="fs-3 fw-bold titulo">${precio(ticketPromedio)}</div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card p-3 text-center shadow-sm border-0">
                        <div class="text-muted small">Cancelados</div>
                        <div class="fs-3 fw-bold titulo">${cancelados}</div>
                    </div>
                </div>
            </div>
            <div class="row g-4">
                <div class="col-md-6">
                    <div class="card p-3 shadow-sm border-0">
                        <h5 class="mb-3">Ventas por zona de entrega</h5>
                        ${
                          Object.keys(zonasVentas).length
                            ? Object.entries(zonasVentas)
                                .sort((a, b) => b[1] - a[1])
                                .map(
                                  ([z, total]) => `
                            <div class="mb-3">
                                <div class="d-flex justify-content-between small mb-1"><span>${escapar(z)}</span><span>${precio(total)}</span></div>
                                <div class="progress" style="height:8px"><div class="progress-bar" style="width:${((total / maxZona) * 100).toFixed(0)}%;background:#b86d2c"></div></div>
                            </div>`,
                                )
                                .join("")
                            : '<p class="text-muted mb-0">Todavía no hay ventas.</p>'
                        }
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card p-3 shadow-sm border-0">
                        <h5 class="mb-3">Pedidos por estado</h5>
                        ${
                          Object.keys(estadosPedidos).length
                            ? `<div class="d-flex flex-wrap gap-2">${Object.entries(
                                estadosPedidos,
                              )
                                .map(
                                  ([e, c]) =>
                                    `<span class="badge text-bg-${colorEstado(e)} fs-6 p-2">${escapar(e)}: ${c}</span>`,
                                )
                                .join("")}</div>`
                            : '<p class="text-muted mb-0">Todavía no hay pedidos.</p>'
                        }
                    </div>
                </div>
            </div>`;
  }

  if (p === "pedidos") {
    let todos = d.pedidos.slice().sort((a, b) => b.id - a.id);
    a.innerHTML = `
            <h1 class="titulo mb-4">Pedidos</h1>
            ${
              todos.length
                ? `<div class="table-responsive">
                    <table class="table align-middle">
                        <thead><tr><th>#</th><th>Cliente</th><th>Fecha</th><th>Entrega</th><th>Detalle</th><th>Total</th><th>Estado</th></tr></thead>
                        <tbody>
                            ${todos
                              .map(
                                (x) => `
                            <tr>
                                <td>#${x.id}</td>
                                <td>${escapar(x.cliente)}${x.correo ? `<br><span class="text-muted small">${escapar(x.correo)}</span>` : ""}${x.telefono ? `<br><span class="text-muted small">${escapar(x.telefono)}</span>` : ""}</td>
                                <td class="small">${formatearFecha(x.fecha)}</td>
                                <td>${escapar(x.entrega)}${x.direccion ? `<br><span class="text-muted small">${escapar(x.direccion)}</span>` : ""}</td>
                                <td class="small">${x.items.map((i) => escapar(i.nombre) + " x" + i.cantidad).join("<br>")}</td>
                                <td>${precio(x.total)}</td>
                                <td>
                                    <select class="form-select form-select-sm" style="min-width:160px" onchange="cambiarEstado(${x.id}, this.value)">
                                        ${opcionesEstado(x.estado)}
                                    </select>
                                </td>
                            </tr>`,
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>`
                : '<p class="text-muted">Todavía no hay pedidos.</p>'
            }`;
  }
}

function actualizarVistaCrepa() {
  const vista = document.getElementById("vista-crepa");
  if (!vista) return;
  const d = datos(),
    ids = [
      Number(document.getElementById("sel-base").value),
      Number(document.getElementById("sel-cubierta").value),
      ...Array.from(
        document.querySelectorAll(".chk-ingrediente:checked"),
        (x) => Number(x.value),
      ),
    ];
  const productos = ids
    .map((id) => d.productos.find((p) => p.id === id))
    .filter(Boolean);
  vista.innerHTML =
    '<div class="crepa-ilustracion" role="img" aria-label="Ilustración de una crepa"><span class="crepa-disco"></span><span class="crepa-doblez"></span></div><p class="mb-1">' +
    escapar(productos.map((p) => p.nombre).join(" · ")) +
    '</p><strong class="fs-4 titulo">' +
    precio(productos.reduce((s, p) => s + p.precio, 0)) +
    '</strong><p class="small text-muted mb-0">Vista ilustrativa</p>';
}
function descargarCSV(nombre, filas) {
  const csv =
    "\uFEFF" +
    filas
      .map((f) =>
        f
          .map(
            (v) =>
              '"' +
              String(v ?? "")
                .replace(/"/g, '""')
                .replace(/^[=+@\-\t\r]/, "'// Inicializar") +
              '"',
          )
          .join(";"),
      )
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportarInventario() {
  descargarCSV("inventario.csv", [
    ["Producto", "Categoría", "Stock", "Mínimo", "Precio"],
    ...datos().productos.map((p) => [
      p.nombre,
      p.categoria,
      p.stock,
      p.min,
      p.precio,
    ]),
  ]);
}
function exportarMovimientos() {
  descargarCSV("movimientos.csv", [
    ["Fecha", "Producto", "Tipo", "Cantidad", "Referencia", "Stock final"],
    ...(datos().movimientos || []).map((m) => [
      m.fecha,
      m.producto,
      m.tipo,
      m.cantidad,
      m.referencia,
      m.stockFinal,
    ]),
  ]);
}
function exportarVentas() {
  descargarCSV("ventas.csv", [
    ["Pedido", "Fecha", "Cliente", "Estado", "Entrega", "Total"],
    ...datos().pedidos.map((p) => [
      p.id,
      p.fecha,
      p.cliente,
      p.estado,
      p.entrega,
      p.total,
    ]),
  ]);
}
function imprimirReporte(tipo) {
  const d = datos(),
    inv = tipo === "inventario",
    cab = inv
      ? ["Producto", "Stock", "Mínimo", "Precio"]
      : ["Pedido", "Fecha", "Estado", "Total"];
  const filas = inv
    ? d.productos.map((p) => [p.nombre, p.stock, p.min, precio(p.precio)])
    : d.pedidos.map((p) => [
        p.id,
        formatearFecha(p.fecha),
        p.estado,
        precio(p.total),
      ]);
  const w = window.open("", "_blank");
  if (!w) return avisar("Habilita las ventanas emergentes para imprimir.");
  const th = cab.map((x) => "<th>" + escapar(x) + "</th>").join("");
  const tr = filas
    .map(
      (f) =>
        "<tr>" + f.map((x) => "<td>" + escapar(x) + "</td>").join("") + "</tr>",
    )
    .join("");
  w.document.write(
    '<!doctype html><html lang="es"><meta charset="utf-8"><title>Reporte CrepasVibes</title><style>body{font:14px Arial;margin:30px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}th{background:#f5e4ce}</style><h1>CrepasVibes - ' +
      (inv ? "Inventario" : "Ventas") +
      "</h1><table><thead><tr>" +
      th +
      "</tr></thead><tbody>" +
      tr +
      "</tbody></table></html>",
  );
  w.document.close();
  w.focus();
  w.print();
}

// Inicializar
document.addEventListener("DOMContentLoaded", async () => {
  await inicializarDatos();
  menu();
  contenido();
  actualizarMisPedidos();
});
