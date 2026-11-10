function sesion() {
    try {
        const usuario = JSON.parse(localStorage.getItem('crepaUsuario'));
        if (usuario?.rol === 'cliente' && !usuario.correo) {
            usuario.correo = 'cliente@gmail.com';
            localStorage.setItem('crepaUsuario', JSON.stringify(usuario));
        }
        return usuario;
    }
    catch (e) { return null; }
}

function entrar(e) {
    e.preventDefault();
    let correo = document.getElementById('correo').value.trim().toLowerCase();
    let clave = document.getElementById('clave').value.trim();
    let u = null;

    if (correo === 'admin@crepasvibes.com' && clave === '1234') u = { rol: 'admin', nombre: 'Administrador', correo };
    if (correo === 'cliente@gmail.com' && clave === 'cliente') u = { rol: 'cliente', nombre: 'Cliente', correo };

    if (!u) return avisar('Datos incorrectos');

    localStorage.setItem('crepaUsuario', JSON.stringify(u));
    ir(u.rol === 'admin' ? 'ADMIN/dashboard.html' : 'CLIENTE/tienda.html');
}

function salir() {
    localStorage.removeItem('crepaUsuario');
    ir('index.html');
}

function revisar(rol) {
    if (sesion()?.rol !== rol) {
        ir('login.html');
        return false;
    }
    return true;
}
