import React from "react";
import {useDispatch, useSelector} from "react-redux";

import ReactAudioPlayer from "react-audio-player";

import {changeStatus, clearAudio, selectAudio, selectInterrupt} from "../reducers/media";
import {PlayerStatus} from "../reducers/const";


const SimpleRecorder = () => {
    const audio = useSelector(selectAudio);
    const isInterrupt = useSelector(selectInterrupt);
    const dispatch = useDispatch();
    const playerRef = useRef();

    useEffect(() => {
        if (isInterrupt.value) { 
          console.log('PAUSING AUDIO')
          // console.log(playerRef.current.audioEl.current)
          playerRef.current.audioEl.current.pause() 
          dispatch(changeStatus({status: PlayerStatus.LISTENING}))
        }
      }, [isInterrupt]);

    return <ReactAudioPlayer src={audio}
                             autoPlay onEnded={() => dispatch(clearAudio())}
                             onPlay={() => dispatch(changeStatus({status: PlayerStatus.RESPONDING}))}/>;
};

export default SimpleRecorder;