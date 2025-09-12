// UpdateForm.jsx

// Import useState from React so we can track user input values (corral + count)
import { useState } from "react";

// Define a functional React component called UpdateForm
function UpdateForm() {
  //    Declare state variables:
  //    - corral: stores the letter of the corral user types in (e.g. "A")
  //    - setCorral: function to update corral
  //    - count: stores the number of carts user types in
  //    - setCount: function to update count
  const [corral, setCorral] = useState("");
  const [count, setCount] = useState("");

  //    Function that runs when the form is submitted
  const handleSubmit = async (e) => {
    //  Prevent the default browser behavior (which would refresh the page on submit)
    e.preventDefault();

    try {
      //    Send a POST request to the backend to update cart counts
      const res = await fetch("http://localhost:3001/api/corrals/update", {
        method: "POST", // tells server this is a create/update action
        headers: {
          "Content-Type": "application/json", // tells backend to expect JSON
        },
        //  Convert JS object into JSON string for sending
        body: JSON.stringify({
          corral_id: corral, // key matches backend expectation
          count: parseInt(count, 10), // ensure count is sent as a number, not string
        }),
      });

      //    Parse the JSON response from the backend
      const data = await res.json();

      //    Log the response in the browser console so we can confirm it worked
      console.log("Update Response:", data);
    } catch (error) {
      //    If fetch fails (server down, network issue, etc.), log the error
      console.error("Error updating corral:", error);
    }
  };

  //    Return the form UI so user can type in corral letter + count and submit
  return (
    <form onSubmit={handleSubmit}>
      {/* Text input for corral ID (e.g., "A") */}
      <input
        type="text"
        placeholder="Corral Letter (e.g. A)"
        value={corral}
        onChange={(e) => setCorral(e.target.value)} // update state when typing
      />

      {/* Number input for cart count */}
      <input
        type="number"
        placeholder="Cart Count"
        value={count}
        onChange={(e) => setCount(e.target.value)} // update state when typing
      />

      {/* Submit button to trigger handleSubmit */}
      <button type="submit">Update Corral</button>
    </form>
  );
}

//  Export component so App.jsx can import and render it
export default UpdateForm;
