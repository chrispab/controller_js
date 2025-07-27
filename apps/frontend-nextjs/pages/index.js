import Link from 'next/link';

export default function Home() {
  const pages = [
    { name: 'Status Page', path: '/status' },
    // Add other pages here as they are created
  ];

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">Available Pages</h1>
      <div className="list-group">
        {pages.map((page) => (
          <Link
            key={page.path}
            href={page.path}
            className="list-group-item list-group-item-action"
          >
            {page.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
