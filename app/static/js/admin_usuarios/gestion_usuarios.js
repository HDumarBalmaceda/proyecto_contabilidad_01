let paginaActual = 1;
let debounceTimer;

// --- 1. CARGA INICIAL Y EVENTOS DE MODAL ---
document.addEventListener("DOMContentLoaded", function() {
    // Carga inicial de datos
    cargarUsuarios(1);

    // Evento del buscador corregido
    const inputBusqueda = document.getElementById('busquedaUsuario');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                cargarUsuarios(1);
            }, 300);
        });
    }

    // Manejo de errores en modal
    const modalElement = document.getElementById('crearUsuarioModal');
    if (modalElement) {
        const tieneErrores = modalElement.querySelector('.alert-danger, .alert-warning');
        if (tieneErrores) {
            const myModal = new bootstrap.Modal(modalElement);
            myModal.show();
        }
        modalElement.addEventListener('hidden.bs.modal', function () {
            const alertas = modalElement.querySelectorAll('.alert');
            alertas.forEach(alerta => alerta.remove());
        });
    }
});

// --- 2. FUNCIÓN PRINCIPAL DE CARGA (SOLO UNA VEZ) ---
function cargarUsuarios(pagina = 1) {
    paginaActual = pagina;
    
    const input = document.getElementById('busquedaUsuario');
    const q = input ? input.value : '';

    const tbody = document.getElementById("tablaUsuariosBody");
    if (!tbody) return;

    // Spinner
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></td></tr>`;

    // Usamos la ruta sin la barra inicial como descubriste que funciona
    fetch(`usuarios_json?page=${pagina}&q=${encodeURIComponent(q)}`)
        .then(res => {
            // Verificamos que la respuesta sea JSON y no una página de error/login
            if (!res.ok) throw new Error('Respuesta no válida del servidor');
            return res.json();
        })
        .then(data => {
            // 1. Llenamos las filas de la tabla
            dibujarTabla(data.usuarios);
            // 2. Llenamos los botones de paginación abajo
            dibujarPaginacion(data);
        })
        .catch(err => {
            console.error("Error cargando usuarios:", err);
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">
                <i class="bi bi-exclamation-circle me-2"></i> Error al cargar los datos.
            </td></tr>`;
        });
}

// --- 3. DIBUJAR TABLA ---
function dibujarTabla(usuarios) {
    const tbody = document.getElementById("tablaUsuariosBody");
    tbody.innerHTML = ''; 

    if (usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted">No se encontraron resultados</td></tr>`;
        return;
    }

    usuarios.forEach(u => {
        const nombreMostrar = u.nombre_completo ? u.nombre_completo : u.username.charAt(0).toUpperCase() + u.username.slice(1);
        
        const badgeRol = u.rol === 'admin' 
            ? `<span class="badge bg-danger text-white px-3"><i class="bi bi-shield-lock me-1"></i> Administrador</span>`
            : `<span class="badge bg-info text-dark px-3"><i class="bi bi-person-badge me-1"></i> Contador</span>`;

        const emailTexto = u.email ? u.email : '<span class="text-muted italic">No registrado</span>';
        const telefonoTexto = u.telefono ? u.telefono : '<span class="text-muted italic">Sin teléfono</span>';

        const tr = `
            <tr>
                <td class="ps-4 text-muted">${u.id}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-light d-flex align-items-center justify-content-center me-3" 
                             style="width: 45px; height: 45px; border: 1px solid #dee2e6;">
                            <i class="bi bi-person-fill text-primary fs-5"></i>
                        </div>
                        <div>
                            <span class="fw-bold d-block">${nombreMostrar}</span>
                            <small class="text-muted">Username: ${u.username}</small>
                        </div>
                    </div>
                </td>
                <td>${badgeRol}</td>
                <td>
                    <div class="small">
                        <div class="mb-1">
                            <i class="bi bi-envelope-fill text-secondary me-1"></i> ${emailTexto}
                        </div>
                        <div>
                            <i class="bi bi-telephone-fill text-secondary me-1"></i> ${telefonoTexto}
                        </div>
                    </div>
                </td>
                <td class="text-center">
                    <div class="btn-group">
                        <button type="button" class="btn btn-sm btn-outline-primary btn-editar-usuario" 
                                data-id="${u.id}" data-username="${u.username}" data-nombre="${u.nombre_completo || ''}"
                                data-email="${u.email || ''}" data-telefono="${u.telefono || ''}" data-rol="${u.rol}">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-usuario" 
                                data-id="${u.id}" data-nombre="${nombreMostrar}" data-url="usuarios/eliminar/${u.id}">
                            <i class="bi bi-trash3-fill"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        tbody.insertAdjacentHTML('beforeend', tr);
    });
}

// --- 4. PAGINACIÓN Y ACCIONES (EDITAR/ELIMINAR) ---
function dibujarPaginacion(data) {
    const contenedor = document.getElementById('controlesPaginacion');
    if (!contenedor) return;


    if (!data.usuarios || data.usuarios.length === 0) {
        contenedor.innerHTML = '<div class="text-muted small px-3">No hay registros para mostrar.</div>';
        return;
    }

    let html = `
        <div class="text-muted small">
            Mostrando <strong>${data.usuarios.length}</strong> usuarios de <strong>${data.total_registros}</strong>
        </div>
        <nav>
            <ul class="pagination pagination-sm mb-0">
                <li class="page-item ${data.tiene_anterior ? '' : 'disabled'}">
                    <a class="page-link" href="javascript:void(0)" 
                       onclick="${data.tiene_anterior ? `cargarUsuarios(${data.pagina_actual - 1})` : ''}">
                       <i class="bi bi-chevron-left"></i>
                    </a>
                </li>
    `;

    // Botones de números
    for (let i = 1; i <= data.total_paginas; i++) {
        html += `
            <li class="page-item ${i === data.pagina_actual ? 'active' : ''}">
                <a class="page-link" href="javascript:void(0)" onclick="cargarUsuarios(${i})">${i}</a>
            </li>
        `;
    }

    html += `
                <li class="page-item ${data.tiene_siguiente ? '' : 'disabled'}">
                    <a class="page-link" href="javascript:void(0)" 
                       onclick="${data.tiene_siguiente ? `cargarUsuarios(${data.pagina_actual + 1})` : ''}">
                       <i class="bi bi-chevron-right"></i>
                    </a>
                </li>
            </ul>
        </nav>
    `;

    contenedor.innerHTML = html;
}

document.addEventListener('click', function (e) {
    // LÓGICA ELIMINAR
    const btnEliminar = e.target.closest('.btn-eliminar-usuario');
    if (btnEliminar) {
        const nombre = btnEliminar.getAttribute('data-nombre');
        const url = btnEliminar.getAttribute('data-url');
        Swal.fire({
            title: `¿Eliminar a ${nombre}?`,
            text: "Se borrarán sus registros asociados.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar'
        }).then((result) => {
            if (result.isConfirmed) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = url;
                document.body.appendChild(form);
                form.submit();
            }
        });
    }

    // LÓGICA EDITAR
    const btnEditar = e.target.closest('.btn-editar-usuario');
    if (btnEditar) {
        const contenedorPass = document.getElementById('contenedor-password');
        const passInput = document.getElementById('password');
        if (contenedorPass) contenedorPass.style.display = 'block';
        if (passInput) passInput.required = false;

        document.getElementById('modalTitle').innerText = "Editar Usuario";
        document.getElementById('usuarioForm').action = "/admin/usuarios/editar"; 
        
        document.getElementById('usuario_id').value = btnEditar.dataset.id;
        document.getElementById('username').value = btnEditar.dataset.username;
        document.getElementById('nombre').value = btnEditar.dataset.nombre;
        document.getElementById('email').value = btnEditar.dataset.email;
        document.getElementById('telefono').value = btnEditar.dataset.telefono;
        document.getElementById('rol').value = btnEditar.dataset.rol;

        new bootstrap.Modal(document.getElementById('crearUsuarioModal')).show();
    }

    // LÓGICA NUEVO USUARIO
    const btnNuevo = e.target.closest('.btn-nuevo-usuario');
    if (btnNuevo) {
        const contenedorPass = document.getElementById('contenedor-password');
        if (contenedorPass) contenedorPass.style.display = 'none';
        
        document.getElementById('modalTitle').innerText = "Registrar Nuevo Usuario";
        const form = document.getElementById('usuarioForm');
        form.reset();
        form.action = "/admin/usuarios/crear";
        document.getElementById('usuario_id').value = "";
    }
});