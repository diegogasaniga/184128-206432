export default function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="error-banner">
      <strong>Error:</strong> {message}
    </div>
  );
}
