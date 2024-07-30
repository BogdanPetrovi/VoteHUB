document.getElementById('all').onclick = () => {
    const votes = document.getElementsByClassName('voted');
    const noVotes = document.getElementsByClassName('notVoted');
    Array.from(votes).forEach(div => {
      div.classList.remove("hidden");
    });
    Array.from(noVotes).forEach(div => {
      div.classList.remove("hidden");
    });
  };

  document.getElementById('noVote').onclick = () => {
    const votes = document.getElementsByClassName('voted');
    const noVotes = document.getElementsByClassName('notVoted');
    Array.from(votes).forEach(div => {
      div.classList.add("hidden");
    });
    Array.from(noVotes).forEach(div => {
      div.classList.remove("hidden");
    });
  };


  document.getElementById('vote').onclick = () => {
    const votes = document.getElementsByClassName('voted');
    const noVotes = document.getElementsByClassName('notVoted');
    Array.from(votes).forEach(div => {
      div.classList.remove("hidden");
    });
    Array.from(noVotes).forEach(div => {
      div.classList.add("hidden");
    });
  };

  document.getElementById('all').onclick = () => {
    const votes = document.getElementsByClassName('voted');
    const noVotes = document.getElementsByClassName('notVoted');
    Array.from(votes).forEach(div => {
      div.classList.remove("hidden");
    });
    Array.from(noVotes).forEach(div => {
      div.classList.remove("hidden");
    });
  };
  
  document.getElementById('oldest').onclick = () => {
    const normal = document.getElementById('normal');
    const reverse = document.getElementById('reverse');
    normal.classList.add('hidden');
    reverse.classList.remove('hidden');
  };

  document.getElementById('newest').onclick = () => {
    const normal = document.getElementById('normal');
    const reverse = document.getElementById('reverse');
    normal.classList.remove('hidden');
    reverse.classList.add('hidden');
  };