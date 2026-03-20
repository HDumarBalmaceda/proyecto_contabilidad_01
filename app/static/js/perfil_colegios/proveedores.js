let timeoutBusqueda;

document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'busquedaProveedor') {
        clearTimeout(timeoutBusqueda);
        
        const texto = e.target.value.trim();
        const select = document.getElementById('selectProveedor');

        // Si borran la búsqueda, podemos limpiar el select o dejarlo como está
        if (texto.length < 2) return;

        timeoutBusqueda = setTimeout(async () => {
            try {
                // Reutilizamos tu ruta: /proveedores/proveedores_json_paginado?q=texto
                const response = await fetch(`/proveedores/proveedores_json_paginado?q=${texto}`);
                const data = await response.json();

                select.innerHTML = ''; // Limpiar opciones anteriores

                if (data.proveedores.length === 0) {
                    const opt = document.createElement('option');
                    opt.disabled = true;
                    opt.textContent = 'No se encontraron resultados...';
                    select.appendChild(opt);
                } else {
                    data.proveedores.forEach(p => {
                        const option = document.createElement('option');
                        option.value = p.id;
                        option.className = 'opcion-proveedor';
                        
                        // Lógica para mostrar nombre o razón social (como lo tienes en el controlador)
                        const nombreMostrar = p.razon_social ? p.razon_social : `${p.primer_nombre} ${p.primer_apellido}`;
                        option.textContent = `${nombreMostrar} | NIT: ${p.documento}`;
                        
                        select.appendChild(option);
                    });
                }
            } catch (error) {
                console.error("Error buscando proveedores:", error);
            }
        }, 300);
    }
});

document.addEventListener('click', function(e) {
    if (e.target.closest('.btn-desvincular')) {
        const btn = e.target.closest('.btn-desvincular');
        const colId = btn.dataset.colegioId;
        const provId = btn.dataset.proveedorId;
        const nombre = btn.dataset.nombre;

        // Llamas a tu función original
        confirmarDesvinculacion(colId, provId, nombre);
    }
});


document.addEventListener('DOMContentLoaded', function() {
    const formVincular = document.getElementById('formVincular');

    if (formVincular) {
        formVincular.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Mostrar estado de carga (opcional)
            const btnSubmit = this.querySelector('button[type="submit"]');
            const originalText = btnSubmit.innerHTML;
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Vinculando...';

            fetch(this.action, {
                method: 'POST',
                body: new FormData(this)
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Vinculado!',
                        text: data.message,
                        confirmButtonColor: '#198754'
                    }).then(() => {
                        location.reload(); // Recarga para ver al proveedor en la lista
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message,
                        confirmButtonColor: '#d33'
                    });
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = originalText;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire('Error', 'No se pudo procesar la solicitud', 'error');
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = originalText;
            });
        });
    }
});

// Función para desvincular (ya queda lista para cuando la necesites)
function confirmarDesvinculacion(colegioId, proveedorId, nombre) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: `Vas a desvincular a "${nombre}". Podrás vincularlo de nuevo más tarde.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, desvincular',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/colegios/desvincular-proveedor/${colegioId}/${proveedorId}`, {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    Swal.fire('Eliminado', data.message, 'success').then(() => {
                        location.reload();
                    });
                }
            });
        }
    });
}



// Buscador en tiempo real dentro del modal
document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'busquedaProveedor') {
        const inputBusqueda = e.target;
        const textoBusqueda = inputBusqueda.value.toLowerCase();
        const opciones = document.querySelectorAll('#selectProveedor option');
        let coincidencias = 0;

        opciones.forEach(option => {
            const textoOpcion = option.text.toLowerCase();
            
            if (textoOpcion.includes(textoBusqueda)) {
                option.classList.remove('opcion-oculta');
                coincidencias++;
            } else {
                option.classList.add('opcion-oculta');
            }
        });

        // Si no hay resultados, podrías mostrar un mensaje o simplemente dejar la lista vacía
        console.log(`Búsqueda: ${textoBusqueda} - Coincidencias: ${coincidencias}`);
    }
});

// DETALLES DE LOS PROVEEDORES 
function verDetalleProveedor(id) {
    fetch(`/proveedores/obtener/${id}`)
        .then(response => {
            if (!response.ok) throw new Error('Error en la red');
            return response.json();
        })
        .then(data => {
            // Mapeo directo a los IDs de tu modal
            document.getElementById('view_tipo_tercero').innerText = data.tipo_tercero;
            document.getElementById('view_documento_full').innerText = data.documento_full;
            document.getElementById('view_razon_social').innerText = data.razon_social;
            document.getElementById('view_p_nombre').innerText = data.p_nombre;
            document.getElementById('view_s_nombre').innerText = data.s_nombre;
            document.getElementById('view_p_apellido').innerText = data.p_apellido;
            document.getElementById('view_s_apellido').innerText = data.s_apellido;
            document.getElementById('view_direccion').innerText = data.direccion;
            document.getElementById('view_ubicacion_full').innerText = data.ubicacion_full;
            document.getElementById('view_movil').innerText = data.movil;
            document.getElementById('view_correo').innerText = data.correo;
            document.getElementById('view_renta').innerText = data.renta;
            document.getElementById('view_banco').innerText = data.banco;
            document.getElementById('view_cuenta').innerText = data.cuenta;

            // Mostrar el modal (usando el ID correcto: verProveedorModal)
            const myModal = new bootstrap.Modal(document.getElementById('verProveedorModal'));
            myModal.show();
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire('Error', 'No se pudo cargar la información', 'error');
        });
}