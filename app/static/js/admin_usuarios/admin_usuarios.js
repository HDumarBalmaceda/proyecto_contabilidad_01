document.addEventListener('click', function(e) {
    const btnEliminar = e.target.closest('.btn-eliminar');
    
    if (btnEliminar) {
        const userId = btnEliminar.getAttribute('data-id');
        const username = btnEliminar.getAttribute('data-username');

        Swal.fire({
            title: `¿Eliminar a ${username}?`,
            text: "Esta acción no se puede deshacer. Se perderán los accesos de este usuario.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                // Loader de procesamiento
                Swal.fire({
                    title: 'Eliminando...',
                    didOpen: () => { Swal.showLoading(); }
                });

                fetch(`/usuarios/eliminar/${userId}`, {
                    method: 'DELETE', // O POST si prefieres, pero DELETE es más semántico
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        Swal.fire('¡Eliminado!', data.message, 'success')
                        .then(() => location.reload());
                    } else {
                        Swal.fire('Error', data.message, 'error');
                    }
                })
                .catch(error => {
                    Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
                });
            }
        });
    }
});