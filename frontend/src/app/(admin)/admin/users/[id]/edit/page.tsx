export default function EditUserPage({ params }: { params: { id: string } }) {
  return (
    <div className="py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Editează Utilizator #{params.id}</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-600">Formular pentru editare utilizator - în dezvoltare.</p>
      </div>
    </div>
  );
}
