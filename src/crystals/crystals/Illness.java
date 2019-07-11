package crystals;

import java.io.Serializable;
import java.util.ArrayList;

public class Illness {

	int inkubationTime;
	boolean infectiousDuringInkubation;
	int radius;
	int infectionProbability;
	int breakoutProbability;
	int infectionDuration;
	boolean infectiousDuringIllness;
	int deadlinessWithoutTreatment;
	int deadlinessWithTreatment;
	boolean vaccinateable;
	boolean resistancesPossible;
	ArrayList<String> symptoms  = new ArrayList<>();
	ArrayList<String> handicapsDuringInfection = new ArrayList<>();
	ArrayList<String> handicapsAfterUntreatedInfection = new ArrayList<>();	
	ArrayList<String> handicapsAfterTreatedInfection = new ArrayList<>();	
	
	public Illness()
	{
		int whatIllness = diceIllness();
		boolean useTemplate = diceMutate();
		switch (whatIllness)
		{
		case 2:
			initStrong(useTemplate);
			break;
		case 1:
			initMiddle(useTemplate);
			break;
		
		case 0: 
		default:
			initWeak(useTemplate);
			break;
		
		}
		
	}

	private void initWeak(boolean useTemplate) {
		// TODO Auto-generated method stub
		inkubationTime=0;
		infectiousDuringInkubation=false;
		radius= 500;
		infectionProbability=100;
		breakoutProbability=100;
		infectionDuration=10000;
		infectiousDuringIllness=false;
		deadlinessWithoutTreatment=0;
		deadlinessWithTreatment=0;
		vaccinateable=true;
		resistancesPossible=true;
;	
	}

	private void initMiddle(boolean useTemplate) {
		// TODO Auto-generated method stub
		
	}

	private void initStrong(boolean useTemplate) {
		// TODO Auto-generated method stub
		
	}

	private boolean diceMutate() {
		// TODO Auto-generated method stub
		return false;
	}

	private int diceIllness() {
		// TODO Auto-generated method stub
		return 0;
	}


}
