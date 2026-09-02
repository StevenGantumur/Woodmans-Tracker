function Disclaimer() {
  return (
    <footer className="border-t border-ink-600 mt-10 pt-6 pb-10">
      <div className="max-w-3xl space-y-4 text-sm text-haze-300 leading-relaxed">
        <p className="label">About this project</p>

        <p>
          This is a prototype, and it leans more visual than production. The lot state you
          are looking at is simulated rather than sensed. What runs underneath it is real
          though: the route really is solved with OR-Tools over measured distances, the
          counts really are stored in PostgreSQL, and the prediction model really is
          trained on the snapshot history. The numbers on this page are output, not
          mockups. It is proof the idea works, not a finished product.
        </p>

        <p>
          What I want to build next is a simulation page that proves the point directly:
          that a worker who can see the best route on a device beats a worker walking the
          lot looking for full corrals. Right now you spend that time guessing, doubling
          back, and clearing a corral somebody already got. I think the difference is real
          and I want to measure it instead of just claiming it.
        </p>

        <p>
          I worked carts. It is a lot of walking and a lot of guessing, and most of that is
          avoidable. Done right this cuts the physical strain of the job and gives cart
          workers back time and better tools to actually succeed at it. I would like to see
          this running at a real store at scale someday.
        </p>

        <p>
          Getting there takes a lot of RFID sensors and production level design work. That
          is not a small lift, but none of it is out of reach.
        </p>

        <p className="text-haze-500 pt-2">— Steven Gantumur, former cart pusher</p>
      </div>
    </footer>
  );
}

export default Disclaimer;
