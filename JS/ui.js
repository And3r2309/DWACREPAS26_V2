// JS/ui.js
const base = location.pathname.includes('/ADMIN/') || location.pathname.includes('/CLIENTE/') ? '../' : '';

function ir(p) { location.href = base + p; }
function escapar(x) { return String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function precio(n) { return '$' + Number(n).toFixed(2); }
function avisar(m) { alert(m); }
function zonas() { return ['Retiro en tienda', 'Santa Tecla', 'Ciudad Merliot', 'Antiguo Cuscatlán'].map(z => `<option>${z}</option>`).join(''); }

function menu() {
    let u = sesion();
    let l = u?.rol === 'admin'
        ? [['ADMIN/dashboard.html', 'Resumen'], ['ADMIN/productos.html', 'Productos'], ['ADMIN/inventario.html', 'Inventario'], ['ADMIN/ventas.html', 'Ventas'], ['ADMIN/pedidos.html', 'Pedidos']]
        : u?.rol === 'cliente'
            ? [['CLIENTE/tienda.html', 'Armar Crepa'], ['CLIENTE/mis-pedidos.html', 'Mis pedidos']]
            : [['index.html', 'Inicio'], ['login.html', 'Ingresar']];

    let navContainer = document.getElementById('nav');
    if (navContainer) {
        navContainer.innerHTML = `
            <nav class="navbar navbar-expand-lg navbar-dark" style="background-color: #b86d2c;">
                <div class="container">
                    <a class="navbar-brand fw-bold" href="${base}index.html">🥞 CrepasVibes</a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#links" aria-controls="links" aria-expanded="false" aria-label="Alternar navegación">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div id="links" class="collapse navbar-collapse">
                        <div class="navbar-nav ms-auto align-items-center">
                            ${l.map(x => {
    // Si el enlace es "Mis pedidos", le agregamos el span para el contador
    let contador = x[1] === 'Mis pedidos' ? ' <span id="badge-pedidos" class="badge bg-danger rounded-pill d-none">0</span>' : '';
    return `<a class="nav-link text-white" href="${base + x[0]}">${x[1]}${contador}</a>`;
}).join('')}
                            ${u ? `<button type="button" class="btn btn-outline-light btn-sm ms-lg-3 mt-2 mt-lg-0" onclick="salir()">Salir</button>` : ''}
                        </div>
                    </div>
                </div>
            </nav>`;
    }
}