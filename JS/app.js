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
    ],
    pedidos: [],
    numero: 1,
};

function datos() {
    try {
        return (
            JSON.parse(localStorage.getItem(llave)) ||
            JSON.parse(JSON.stringify(inicio))
        );
    } catch (e) {
        return JSON.parse(JSON.stringify(inicio));
    }
}
function guardar(d) {
    localStorage.setItem(llave, JSON.stringify(d));
}

let carrito = [];

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
}

function quitar(idTemporal) {
    carrito = carrito.filter((x) => x.idTemporal !== idTemporal);
    mostrarCarrito();
}

function costo(z) {
    return (
        { "Santa Tecla": 0.5, "Ciudad Merliot": 1, "Antiguo Cuscatlán": 1.5 }[z] ||
        0
    );
}

function comprar(e) {
    e.preventDefault();
    let err = pedido(
        "Cliente",
        carrito,
        document.getElementById("zona").value,
        document.getElementById("direccion").value,
    );
    if (err) return avisar(err);
    carrito = [];
    avisar("Pedido registrado exitosamente");
    location.reload();
}

function pedido(cliente, items, z, dir) {
    let d = datos();
    if (!items.length) return "Agrega productos al carrito";
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
        cliente,
        items: detalle,
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
    const orden = { base: 0, ingrediente: 1, cubierta: 2 };
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
    guardar(d);
    avisar(`Se agregaron ${cant} unidades a ${p.nombre}. Stock actual: ${p.stock}.`);
    contenido();
}

// ---------- Pedidos: cambiar estado ----------

function cambiarEstado(id, nuevo) {
    let d = datos();
    let ped = d.pedidos.find((x) => x.id === id);
    if (!ped) return;
    ped.estado = nuevo;
    guardar(d);
    contenido();
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

        a.innerHTML = `
            <h1 class="titulo mb-4">Arma tu Crepa</h1>
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
                        <button type="submit" class="btn btn-crepa w-100">Agregar al carrito</button>
                    </form>
                </div>
                <div class="col-md-5">
                    <div class="card p-4 shadow-sm border-0">
                        <h3>Mi Carrito</h3>
                        <div id="carrito"></div>
                        <form id="compra" class="mt-4">
                            <label for="zona">Entrega</label>
                            <select id="zona" class="form-select mb-3">${zonas()}</select>
                            <label for="direccion">Dirección</label>
                            <input id="direccion" class="form-control mb-3">
                            <button class="btn btn-success w-100 fw-bold">Confirmar Pedido</button>
                        </form>
                    </div>
                </div>
            </div>`;
        mostrarCarrito();
        document.getElementById("form-crepa").onsubmit = armarCrepa;
        document.getElementById("compra").onsubmit = comprar;
    }

    if (p === "mis") {
        a.innerHTML = `<h1 class="titulo">Mis pedidos</h1>
            ${d.pedidos
                .filter((x) => x.cliente === "Cliente")
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
        let ultimos = d.pedidos.slice().sort((a, b) => b.id - a.id).slice(0, 5);

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
                        ${ultimos.length
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
                        ${stockBajo.length
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
            <h1 class="titulo mb-4">Inventario</h1>
            ${bajo.length
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
            </div>`;
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
            <h1 class="titulo mb-4">Ventas</h1>
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
                        ${Object.keys(zonasVentas).length
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
                        ${Object.keys(estadosPedidos).length
                ? `<div class="d-flex flex-wrap gap-2">${Object.entries(estadosPedidos).map(([e, c]) => `<span class="badge text-bg-${colorEstado(e)} fs-6 p-2">${escapar(e)}: ${c}</span>`).join("")}</div>`
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
            ${todos.length
                ? `<div class="table-responsive">
                    <table class="table align-middle">
                        <thead><tr><th>#</th><th>Cliente</th><th>Fecha</th><th>Entrega</th><th>Detalle</th><th>Total</th><th>Estado</th></tr></thead>
                        <tbody>
                            ${todos
                    .map(
                        (x) => `
                            <tr>
                                <td>#${x.id}</td>
                                <td>${escapar(x.cliente)}</td>
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

function actualizarMisPedidos() {
    let d = datos();
    
    // Filtramos los pedidos del cliente que NO estén entregados ni cancelados
    let pedidosActivos = d.pedidos.filter(x => 
        x.cliente === "Cliente" && 
        x.estado !== "Entregado" && 
        x.estado !== "Cancelado"
    );
    
    let badge = document.getElementById("badge-pedidos");
    
    if (badge) {
        if (pedidosActivos.length > 0) {
            badge.textContent = pedidosActivos.length;
            badge.classList.remove("d-none"); // Muestra el circulito
        } else {
            badge.classList.add("d-none"); // Lo oculta si ya no hay pedidos activos
        }
    }
}
// Inicializar
document.addEventListener("DOMContentLoaded", () => {
    menu();
    contenido();
    actualizarMisPedidos(); // <--- Agrega esta línea aquí
});