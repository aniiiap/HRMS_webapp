import React, { useState } from 'react';
import { Target, TrendingUp, Award, Star, ThumbsUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function PerformanceProductPage() {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("Please select a rating first!");
      return;
    }
    toast.success("Feedback submitted to HR!", { icon: '🎉' });
    setSubmitted(true);
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-left">
            <div className="text-fuchsia-600 dark:text-fuchsia-400 font-bold tracking-wider text-sm uppercase mb-4">Performance & Growth</div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">Build a <span className="text-fuchsia-500">high-performing</span> culture</h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">Run 360-degree reviews, track OKRs, and give continuous feedback to keep your team aligned and motivated.</p>
            <Link to="/demo" className="inline-flex px-8 py-4 text-lg font-semibold rounded-full text-white bg-fuchsia-600 hover:bg-fuchsia-700 transition-all hover:-translate-y-1">Explore Performance</Link>
          </div>

          <div className="relative">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Q3 Manager Review: Sarah Jenkins</h3>
              {!submitted ? (
                <>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">How well did Sarah meet her OKRs this quarter?</p>
                  <div className="flex gap-2 mb-8">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} onClick={() => setRating(star)} className="focus:outline-none hover:scale-110 transition-transform">
                        <Star className={`w-10 h-10 ${rating >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                      </button>
                    ))}
                  </div>
                  <button onClick={handleSubmit} className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-4 rounded-xl">Submit Review</button>
                </>
              ) : (
                <div className="text-center py-8">
                  <ThumbsUp className="w-16 h-16 text-fuchsia-500 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">Review Logged</h4>
                  <p className="text-slate-500">Sarah's profile has been updated.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
