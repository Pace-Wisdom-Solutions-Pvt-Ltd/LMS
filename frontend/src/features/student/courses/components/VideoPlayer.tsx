// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

export default function VideoPlayer({
  title,
  yid,
}: {
  readonly title: string;
  readonly yid: string;
}) {
  return (
    <div className="aspect-video w-full max-w-2xl mx-auto rounded-3xl overflow-hidden bg-black shadow-2xl transition-all duration-700">
      <iframe
        src={`https://www.youtube.com/embed/${yid}?rel=0&modestbranding=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
}
