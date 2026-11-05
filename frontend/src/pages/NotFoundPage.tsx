import React from "react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="card mx-auto max-w-md my-12 text-center py-10">
      <h1 className="text-3xl font-bold text-slate-900">404</h1>
      <p className="mt-2 text-slate-600">This page does not exist or has been moved.</p>
      <Link to="/dashboard" className="btn-primary mt-6 inline-block">
        Back to Dashboard
      </Link>
    </div>
  );
}
