import axios from 'axios';
import * as React from 'react';
import { useHistory } from 'react-router-dom';

const MeetingList = () => {
  const [meetingList, setMeetingList] = React.useState<Array<any>>([]);
  const history = useHistory();

  React.useEffect(() => {
    const getMeetings = async () => {
      try {
        const { data }: any = await axios.get('http://localhost:3000/chime');
        setMeetingList([...data]);
      } catch (error) {
        setMeetingList([]);
      }
    };
    getMeetings();
  }, []);

  const handleRedirect = (meetingId: string) => {
    history.push(`/home/${meetingId}`);
  };

  return (
    <React.Fragment>
      <div className='col'>
        <h1 className='h1'>SUPERVISOR</h1>
      </div>
      <div className='row'>
        {meetingList.length === 0 ? (
          <h1 className='h1'>Ypu don't have meetings yet</h1>
        ) : (
          meetingList.map((meeting, ix) => {
            return (
              <div className='col-2' key={`${meeting.MeetingId}`}>
                <div className='card'>
                  <div className='card-body'>
                    <h5 className='card-title'>
                      Meeting No. {`${meeting.MeetingId}`}
                    </h5>

                    <button
                      className='btn btn-primary'
                      onClick={() => handleRedirect(meeting.MeetingId)}
                    >
                      Start watching
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </React.Fragment>
  );
};

export default MeetingList;
