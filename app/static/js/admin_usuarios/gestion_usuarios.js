// funcion para alerta de creacion de usuarios 

document.addEventListener("DOMContentLoaded", function() {
    // 1. Manejo de apertura automática del modal en caso de error
    const modalElement = document.getElementById('crearUsuarioModal');
    
    if (modalElement) {
        // Buscamos si hay alertas de error o advertencia dentro del modal
        const tieneErrores = modalElement.querySelector('.alert-danger, .alert-warning');

        if (tieneErrores) {
            const myModal = new bootstrap.Modal(modalElement);
            myModal.show();
        }
    }

    // 2. Limpieza de alertas al cerrar el modal (opcional, para que no queden ahí si se reabre)
    modalElement.addEventListener('hidden.bs.modal', function () {
        const alertas = modalElement.querySelectorAll('.alert');
        alertas.forEach(alerta => alerta.remove());
    });
});

// logica para la barra de busqueda 
document.addEventListener('keyup', function(e) {
    if (e.target.id === 'busquedaUsuario') {
        const busqueda = e.target.value.toLowerCase();
        // Buscamos todas las filas del cuerpo de la tabla
        const filas = document.querySelectorAll('table tbody tr');

        filas.forEach(fila => {
            // Obtenemos el texto de la fila (ignorando la columna de acciones)
            const textoFila = fila.innerText.toLowerCase();
            
            // Si el texto coincide, mostramos la fila, si no, la ocultamos
            if (textoFila.includes(busqueda)) {
                fila.style.display = '';
            } else {
                fila.style.display = 'none';
            }
        });
    }
});

// funcion para editar usuarios 

document.addEventListener('click', function (e) {
    const btnEliminar = e.target.closest('.btn-eliminar-usuario');

    if (btnEliminar) {
        const nombre = btnEliminar.getAttribute('data-nombre');
        const url = btnEliminar.getAttribute('data-url');

        Swal.fire({
            title: `¿Eliminar a ${nombre}?`,
            text: "Se borrarán sus proveedores y los colegios quedarán libres.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                // Creamos el form para enviar el POST a la ruta de Python
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = url;
                document.body.appendChild(form);
                form.submit();
            }
        });
    }
});

// funcion para editar usuarios 
document.addEventListener('click', function (e) {
    const contenedorPass = document.getElementById('contenedor-password');
    const passInput = document.getElementById('password');

    // --- LÓGICA EDITAR ---
    const btnEditar = e.target.closest('.btn-editar-usuario');
    if (btnEditar) {
        if (contenedorPass) contenedorPass.style.display = 'block'; // Mostrar al editar
        if (passInput) passInput.required = false;

        const form = document.getElementById('usuarioForm');
        const spanTitle = document.getElementById('modalTitle');
        
        if (spanTitle) spanTitle.innerText = "Editar Usuario";
        if (form) form.action = "/admin/usuarios/editar"; 

        // Llenar campos...
        document.getElementById('usuario_id').value = btnEditar.dataset.id;
        document.getElementById('username').value = btnEditar.dataset.username;
        document.getElementById('nombre').value = btnEditar.dataset.nombre;
        document.getElementById('email').value = btnEditar.dataset.email;
        document.getElementById('telefono').value = btnEditar.dataset.telefono;
        document.getElementById('rol').value = btnEditar.dataset.rol;

        const bsModal = new bootstrap.Modal(document.getElementById('crearUsuarioModal'));
        bsModal.show();
    }

    // --- LÓGICA NUEVO USUARIO ---
    const btnNuevo = e.target.closest('.btn-nuevo-usuario');
    if (btnNuevo) {
        if (contenedorPass) contenedorPass.style.display = 'none'; // OCULTAR al crear
        if (passInput) {
            passInput.required = false; // Ya no es requerido porque lo hará el backend
            passInput.value = ""; 
        }

        const form = document.getElementById('usuarioForm');
        const spanTitle = document.getElementById('modalTitle');
        
        if (spanTitle) spanTitle.innerText = "Registrar Nuevo Usuario";
        if (form) {
            form.reset();
            form.action = "/admin/usuarios/crear";
            document.getElementById('usuario_id').value = "";
        }
    }
});